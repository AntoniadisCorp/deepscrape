import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService, BillingService, FirestoreService } from 'src/app/core/services';
import { OrganizationService } from 'src/app/core/services/organization.service';
import { serverTimestamp } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { BillingPlanCatalog, BillingPlanTier } from 'src/app/core/types';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinner, CommonModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent implements OnInit {
  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private billingService = inject(BillingService);
  private orgService = inject(OrganizationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private readonly currentUser = toSignal(this.authService.user$);
  private readonly catalogPlans = toSignal(this.billingService.getPlans$(true), { initialValue: [] as BillingPlanCatalog[] });

  readonly totalSteps = 3;
  step = signal(1);
  loading = signal(false);
  errorMessage = signal('');
  enterpriseRequestLoading = signal(false);
  enterpriseRequestMessage = signal('');

  workspaceForm!: FormGroup;
  inviteForm!: FormGroup;
  planForm!: FormGroup;
  enterpriseRequestForm!: FormGroup;

  readonly selectablePlans = computed(() => this.catalogPlans().filter((plan) => plan.id !== 'enterprise'));
  readonly enterprisePlan = computed(() => this.catalogPlans().find((plan) => plan.id === 'enterprise') || null);

  private get uid(): string | undefined {
    return this.currentUser()?.uid;
  }

  private get accountEmail(): string {
    return (this.currentUser()?.email || '').trim().toLowerCase();
  }

  private get defaultOrgId(): string | undefined {
    return this.currentUser()?.defaultOrgId;
  }

  get inviteEmails(): FormArray {
    return this.inviteForm.get('emails') as FormArray;
  }

  ngOnInit(): void {
    const displayName = this.currentUser()?.details?.displayName ?? '';
    const currentOrgName = `${displayName} Workspace`.trim();

    this.workspaceForm = this.fb.group({
      workspaceName: [currentOrgName || 'My Workspace', [Validators.required, Validators.minLength(2), Validators.maxLength(64)]],
    });

    this.inviteForm = this.fb.group({
      emails: this.fb.array([this.createEmailControl()]),
    });

    this.planForm = this.fb.group({
      plan: ['free'],
    });

    this.enterpriseRequestForm = this.fb.group({
      mode: ['current'],
      contactEmail: [this.accountEmail, [Validators.required, Validators.email]],
    });

    this.enterpriseRequestForm.get('mode')?.valueChanges.subscribe((mode) => {
      const useCurrent = mode !== 'custom';
      const nextValue = useCurrent ? this.accountEmail : '';
      this.enterpriseRequestForm.get('contactEmail')?.setValue(nextValue);
      this.enterpriseRequestForm.get('contactEmail')?.markAsPristine();
      this.enterpriseRequestMessage.set('');
    });
  }

  createEmailControl(): AbstractControl {
    return this.fb.control('', [Validators.email]);
  }

  addEmail(): void {
    if (this.inviteEmails.length < 5) {
      this.inviteEmails.push(this.createEmailControl());
    }
  }

  removeEmail(index: number): void {
    if (this.inviteEmails.length > 1) {
      this.inviteEmails.removeAt(index);
    }
  }

  selectPlan(planId: BillingPlanTier): void {
    if (planId === 'enterprise') {
      return;
    }
    this.planForm.get('plan')?.setValue(planId);
  }

  getPreferredPriceLabel(plan: BillingPlanCatalog): string {
    const monthlyAmount = Number(plan.prices.monthly?.amount || 0);
    const paygAmount = Number(plan.prices.payAsYouGo?.amount || 0);
    const chosenAmount = monthlyAmount > 0 ? monthlyAmount : paygAmount;

    if (chosenAmount <= 0) {
      return 'EUR 0';
    }

    return `EUR ${this.formatCents(chosenAmount)}`;
  }

  getPlanIntervals(plan: BillingPlanCatalog): string {
    const labels: string[] = [];
    if (plan.prices.payAsYouGo?.amount !== undefined) labels.push('pay-as-you-go');
    if (plan.prices.monthly?.amount !== undefined) labels.push('monthly');
    if (plan.prices.quarterly?.amount !== undefined) labels.push('quarterly');
    if (plan.prices.annually?.amount !== undefined) labels.push('annually');
    return labels.join(', ');
  }

  isEnterpriseCustomEmailMode(): boolean {
    return this.enterpriseRequestForm.get('mode')?.value === 'custom';
  }

  getCurrentEnterpriseEmailLabel(): string {
    return this.accountEmail || 'no email available';
  }

  async submitEnterpriseRequest(): Promise<void> {
    if (!this.uid || this.enterpriseRequestLoading()) {
      return;
    }

    const mode = this.enterpriseRequestForm.get('mode')?.value;
    const contactEmail = String(mode === 'custom' ? this.enterpriseRequestForm.get('contactEmail')?.value : this.accountEmail)
      .trim()
      .toLowerCase();
    if (!contactEmail || this.enterpriseRequestForm.get('contactEmail')?.invalid) {
      this.enterpriseRequestForm.get('contactEmail')?.markAsTouched();
      return;
    }

    this.enterpriseRequestLoading.set(true);
    this.enterpriseRequestMessage.set('');

    try {
      await this.billingService.submitEnterprisePlanRequest({
        contactEmail,
        workspaceName: String(this.workspaceForm.value.workspaceName || '').trim(),
        selectedPlan: this.planForm.value.plan || null,
      });
      this.enterpriseRequestMessage.set('Enterprise request sent to admin emails queue.');
    } catch (error: any) {
      this.enterpriseRequestMessage.set(error?.message || 'Failed to submit enterprise request.');
    } finally {
      this.enterpriseRequestLoading.set(false);
    }
  }

  next(): void {
    if (this.step() < this.totalSteps) {
      this.step.update(s => s + 1);
    }
  }

  back(): void {
    if (this.step() > 1) {
      this.step.update(s => s - 1);
    }
  }

  skip(): void {
    if (this.step() < this.totalSteps) {
      this.next();
    } else {
      this.complete();
    }
  }

  async complete(): Promise<void> {
    const uid = this.uid;
    if (!uid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      // Step 1 result: rename the org
      const orgId = this.defaultOrgId;
      const workspaceName = this.workspaceForm.value.workspaceName?.trim();
      if (orgId && workspaceName) {
        await this.orgService.renameOrganization(orgId, workspaceName).toPromise();
      }

      // Step 2 result: send invitations for filled email fields
      const validEmails = (this.inviteForm.value.emails as string[])
        .map(e => e?.trim())
        .filter(e => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

      if (orgId && validEmails.length) {
        for (const email of validEmails) {
          await this.orgService.createInvitation(orgId, email, 'member').toPromise();
        }
      }

      // Mark onboarding complete on the user document
      await this.firestoreService.setUserData(uid, {
        onboardedAt: serverTimestamp() as any,
        plan: (this.planForm.value.plan ?? 'free') as BillingPlanTier,
      });

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage.set(err?.message ?? 'Something went wrong. Please try again.');
      this.loading.set(false);
    }
  }

  private formatCents(amount: number): string {
    return (amount / 100).toFixed(2);
  }
}
