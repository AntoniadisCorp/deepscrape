import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RippleDirective } from 'src/app/core/directives'
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-admin-project-config',
  standalone: true,
  imports: [CommonModule, RippleDirective],
  template: `
    <section class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-6 rounded-2xl border border-gray2/80 bg-[#212121] p-6 shadow-[0_8px_32px_-20px_rgba(15,23,42,0.35)] dark:border-gray5/70 dark:bg-[#212121]">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-gray5/90 dark:text-gray3/90">Admin Configuration</p>
        <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-gray6 sm:text-3xl dark:text-white">
          Project Security Controls
        </h1>
        <p class="mt-3 max-w-3xl text-sm leading-relaxed text-gray5 dark:text-gray3">
          Control project-wide TOTP MFA for authenticator apps. Turning this off prevents new enrollments and can break existing second-factor sign-ins.
        </p>
      </header>

      <article class="overflow-hidden rounded-2xl border border-gray2 bg-[#212121] shadow-[0_20px_50px_-32px_rgba(15,23,42,0.45)] dark:border-gray5 dark:bg-[#212121]">
        <div class="border-b border-gray2 bg-[#212121]/95 px-5 py-4 dark:border-gray5 dark:bg-[#212121]/95 sm:px-6">
          <h2 class="text-lg font-bold text-gray6 dark:text-white">Authenticator App MFA</h2>
          <p class="mt-1 text-sm text-gray5 dark:text-gray3">Applies to the full Firebase project.</p>
        </div>

        <div class="space-y-5 px-5 py-5 sm:px-6">
          <div class="flex flex-col gap-4 rounded-xl border border-gray2 bg-[#212121] p-4 shadow-sm dark:border-gray5 dark:bg-[#212121] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-gray6 dark:text-white">Current Status</p>
              <p class="mt-1 text-sm" [class]="statusToneClass()">{{ statusLabel() }}</p>
            </div>

            <button
              type="button"
              role="switch"
              [attr.aria-checked]="totpEnabled()"
              [disabled]="isBusy()"
              (click)="toggleTotp()"
              appRipple
              rippleColor="light"
              class="group relative inline-flex h-11 w-[86px] items-center rounded-full border-2 border-gray3 bg-[#212121] p-1 transition-all duration-300 ease-out hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray4 dark:bg-[#212121]"
              [class.!border-cyan-600]="totpEnabled()"
              [class.ring-2]="isLoading()"
              [class.ring-cyan-400]="isLoading()"
            >
              <span
                class="absolute left-3 right-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-gray5 transition-opacity duration-300 dark:text-gray2"
                [class.opacity-0]="totpEnabled()"
              >OFF</span>
              <span
                class="absolute left-3 right-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-opacity duration-300"
                [class.opacity-0]="!totpEnabled()"
              >ON</span>
              <span
                class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2a2a] shadow-[0_6px_20px_-10px_rgba(15,23,42,0.75)] transition-transform duration-300 ease-out"
                [class.translate-x-[48px]]="totpEnabled()"
              >
                <span class="h-2.5 w-2.5 rounded-full bg-cyan-500 transition-colors duration-300" [class.!bg-rose-500]="!totpEnabled()"></span>
              </span>
            </button>
          </div>

          <div class="rounded-xl border border-amber-200/70 bg-[#212121] p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-[#212121] dark:text-amber-200">
            <p class="font-semibold">Security note</p>
            <p class="mt-1">Use this only for project-level policy changes. User-level MFA enrollment is managed in each account settings page.</p>
          </div>

          @if (isStatusLoading()) {
            <div class="rounded-lg border border-gray2 bg-[#212121] px-4 py-3 text-sm text-gray5 dark:border-gray5 dark:bg-[#212121] dark:text-gray2">
              Reading current project MFA configuration...
            </div>
          }

          @if (successMessage()) {
            <div class="rounded-lg border border-emerald-200 bg-[#212121] px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-[#212121] dark:text-emerald-200">
              {{ successMessage() }}
            </div>
          }

          @if (errorMessage()) {
            <div class="rounded-lg border border-rose-200 bg-[#212121] px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900/70 dark:bg-[#212121] dark:text-rose-200">
              {{ errorMessage() }}
            </div>
          }

          <div class="flex items-center justify-end gap-3 border-t border-gray2 pt-5 dark:border-gray5">
            <button
              type="button"
              (click)="loadTotpStatus()"
              [disabled]="isBusy()"
              appRipple
              rippleColor="dark"
              class="btn btn-sm btn-gray btn-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
            <button
              type="button"
              (click)="toggleTotp()"
              [disabled]="isBusy()"
              appRipple
              rippleColor="light"
              class="btn btn-sm btn-blue btn-ring btn-ring-blue !border-cyan-600 !bg-cyan-600 hover:!border-cyan-700 hover:!bg-cyan-700 dark:!border-cyan-500 dark:!bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isLoading() ? 'Updating...' : (totpEnabled() ? 'Disable TOTP MFA' : 'Enable TOTP MFA') }}
            </button>
          </div>
        </div>
      </article>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProjectConfigComponent implements OnInit {
  private authService = inject(AuthService);

  protected readonly isLoading = signal(false)
  protected readonly isStatusLoading = signal(false)
  protected readonly totpEnabled = signal(false)
  protected readonly successMessage = signal('')
  protected readonly errorMessage = signal('')
  protected readonly isBusy = computed(() => this.isLoading() || this.isStatusLoading())
  protected readonly statusLabel = computed(() => this.totpEnabled() ? 'Enabled for this project' : 'Disabled for this project')
  protected readonly statusToneClass = computed(() => this.totpEnabled() ?
    'text-emerald-700 dark:text-emerald-300' :
    'text-amber-700 dark:text-amber-300')

  async ngOnInit(): Promise<void> {
    await this.loadTotpStatus()
  }

  protected async loadTotpStatus(): Promise<void> {
    this.isStatusLoading.set(true)
    this.errorMessage.set('')
    this.successMessage.set('')

    try {
      const status = await this.authService.getTotpMfaProjectStatus()
      const isEnabled = status.config?.state === 'ENABLED' || status.status === 'enabled' || status.status === 'already-enabled'
      this.totpEnabled.set(isEnabled)
      this.successMessage.set(status.message)
    } catch (error: any) {
      this.errorMessage.set(error?.message || 'Failed to load TOTP MFA project status')
    } finally {
      this.isStatusLoading.set(false)
    }
  }

  protected async toggleTotp(): Promise<void> {
    if (this.isBusy()) {
      return
    }

    const nextEnabledState = !this.totpEnabled()
    this.isLoading.set(true)
    this.successMessage.set('')
    this.errorMessage.set('')

    try {
      const result = await this.authService.setTotpMfaProjectEnabled(nextEnabledState)
      const isEnabled = result.config?.state === 'ENABLED' || result.status === 'enabled' || result.status === 'already-enabled'
      this.totpEnabled.set(isEnabled)
      this.successMessage.set(result.message || 'TOTP MFA project configuration updated successfully.')
    } catch (error: any) {
      this.errorMessage.set(error?.message || 'Failed to update TOTP MFA')
      console.error('TOTP MFA update error:', error)
    } finally {
      this.isLoading.set(false)
    }
  }
}
