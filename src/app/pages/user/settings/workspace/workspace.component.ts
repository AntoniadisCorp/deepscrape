import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core'
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { finalize } from 'rxjs'
import { IfAuthorizedDirective, RippleDirective } from 'src/app/core/directives'
import {
  AuthzService,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationService,
  OrganizationSummary,
  SnackbarService,
} from 'src/app/core/services'
import { SnackBarType } from 'src/app/core/components'

@Component({
  selector: 'app-workspace-tab',
  imports: [ReactiveFormsModule, IfAuthorizedDirective, RippleDirective],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block py-5',
  },
})
export class WorkspaceTabComponent {
  private organizationService = inject(OrganizationService)
  private authzService = inject(AuthzService)
  private snackbar = inject(SnackbarService)
  private destroyRef = inject(DestroyRef)

  organizations = signal<OrganizationSummary[]>([])
  invitations = signal<OrganizationInvitation[]>([])
  members = signal<OrganizationMember[]>([])

  selectedOrgId = signal<string | null>(null)
  isLoading = signal(false)
  isMembersLoading = signal(false)
  isSubmittingCreate = signal(false)
  isSubmittingInvite = signal(false)
  isAcceptingInvite = signal<string | null>(null)
  isRemovingMember = signal<string | null>(null)

  readonly selectedOrganization = computed(() => {
    const currentId = this.selectedOrgId()
    return this.organizations().find((org) => org.id === currentId) || null
  })

  readonly createOrgForm = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(64)],
      nonNullable: true,
    }),
  })

  readonly inviteForm = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    role: new FormControl<'admin' | 'member' | 'viewer'>('member', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  })

  ngOnInit(): void {
    this.refreshWorkspaceData()
  }

  refreshWorkspaceData(): void {
    this.isLoading.set(true)

    this.organizationService
      .listMyOrganizations()
      .pipe(
        finalize(() => {
          this.isLoading.set(false)
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const orgs = response.organizations || []
          this.organizations.set(orgs)

          const activeOrgId = this.organizationService.getActiveOrganization() || orgs[0]?.id || null
          this.selectedOrgId.set(activeOrgId)

          if (activeOrgId) {
            this.loadMembers(activeOrgId)
          } else {
            this.members.set([])
          }
        },
        error: () => {
          this.organizations.set([])
          this.selectedOrgId.set(null)
          this.members.set([])
          this.showError('Failed to load workspaces')
        },
      })

    this.organizationService
      .listMyInvitations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.invitations.set(response.invitations || [])
        },
        error: () => {
          this.invitations.set([])
          this.showError('Failed to load invitations')
        },
      })
  }

  onSelectOrganization(orgId: string): void {
    if (!orgId) {
      return
    }

    this.selectedOrgId.set(orgId)
    this.organizationService.setActiveOrganization(orgId)
    this.loadMembers(orgId)
  }

  createWorkspace(): void {
    if (this.createOrgForm.invalid || this.isSubmittingCreate()) {
      this.createOrgForm.markAllAsTouched()
      return
    }

    const name = this.createOrgForm.controls.name.value.trim()
    if (!name) {
      return
    }

    this.isSubmittingCreate.set(true)
    this.organizationService
      .createOrganization(name)
      .pipe(
        finalize(() => {
          this.isSubmittingCreate.set(false)
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.createOrgForm.reset({ name: '' })
          this.showSuccess('Workspace created')
          this.refreshWorkspaceData()
        },
        error: () => {
          this.showError('Failed to create workspace')
        },
      })
  }

  inviteMember(): void {
    const orgId = this.selectedOrgId()
    if (!orgId || this.inviteForm.invalid || this.isSubmittingInvite()) {
      this.inviteForm.markAllAsTouched()
      return
    }

    const email = this.inviteForm.controls.email.value.trim().toLowerCase()
    const role = this.inviteForm.controls.role.value

    this.isSubmittingInvite.set(true)
    this.organizationService
      .createInvitation(orgId, email, role)
      .pipe(
        finalize(() => {
          this.isSubmittingInvite.set(false)
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.inviteForm.reset({ email: '', role: 'member' })
          this.showSuccess('Invitation sent')
          this.refreshWorkspaceData()
        },
        error: () => {
          this.showError('Failed to send invitation')
        },
      })
  }

  acceptInvitation(invitationId: string): void {
    if (!invitationId || this.isAcceptingInvite()) {
      return
    }

    this.isAcceptingInvite.set(invitationId)
    this.organizationService
      .acceptInvitation(invitationId)
      .pipe(
        finalize(() => {
          this.isAcceptingInvite.set(null)
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.showSuccess('Invitation accepted')
          this.refreshWorkspaceData()
        },
        error: () => {
          this.showError('Failed to accept invitation')
        },
      })
  }

  removeMember(userId: string): void {
    const orgId = this.selectedOrgId()
    if (!orgId || !userId || this.isRemovingMember()) {
      return
    }

    this.isRemovingMember.set(userId)
    this.organizationService
      .removeMember(orgId, userId)
      .pipe(
        finalize(() => {
          this.isRemovingMember.set(null)
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.showSuccess('Member removed')
          this.loadMembers(orgId)
        },
        error: () => {
          this.showError('Failed to remove member')
        },
      })
  }

  canManageCurrentOrg(): boolean {
    const selected = this.selectedOrganization()
    if (!selected) {
      return false
    }

    return this.authzService.can('organization', 'manage', {
      orgId: selected.id,
      ownerId: selected.ownerId,
    })
  }

  private loadMembers(orgId: string): void {
    this.isMembersLoading.set(true)
    this.organizationService
      .listMembers(orgId)
      .pipe(
        finalize(() => {
          this.isMembersLoading.set(false)
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.members.set(response.members || [])
        },
        error: () => {
          this.members.set([])
          this.showError('Failed to load members')
        },
      })
  }

  private showSuccess(message: string): void {
    this.snackbar.showSnackBar(message, SnackBarType.success)
  }

  private showError(message: string): void {
    this.snackbar.showSnackBar(message, SnackBarType.error)
  }
}
