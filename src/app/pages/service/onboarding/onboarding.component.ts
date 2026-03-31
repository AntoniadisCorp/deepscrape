import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService, FirestoreService } from 'src/app/core/services';
import { OrganizationService } from 'src/app/core/services/organization.service';
import { serverTimestamp } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

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
  private orgService = inject(OrganizationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private readonly currentUser = toSignal(this.authService.user$);

  readonly totalSteps = 3;
  step = signal(1);
  loading = signal(false);
  errorMessage = signal('');

  workspaceForm!: FormGroup;
  inviteForm!: FormGroup;
  planForm!: FormGroup;

  readonly plans = [
    { id: 'free', label: 'Free', description: 'For individuals & experimentation', price: '$0/mo' },
    { id: 'starter', label: 'Starter', description: 'For small teams & regular use', price: '$19/mo' },
    { id: 'pro', label: 'Pro', description: 'For growing teams & power users', price: '$49/mo' },
  ] as const;

  private get uid(): string | undefined {
    return this.currentUser()?.uid;
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

  selectPlan(planId: string): void {
    this.planForm.get('plan')?.setValue(planId);
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
        plan: (this.planForm.value.plan ?? 'free') as any,
      });

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage.set(err?.message ?? 'Something went wrong. Please try again.');
      this.loading.set(false);
    }
  }
}
