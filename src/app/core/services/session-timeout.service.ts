import { Injectable, inject, signal, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { interval, Subscription } from 'rxjs'
import { MatSnackBar } from '@angular/material/snack-bar'
import { AuthService } from './auth.service'
import { environment } from 'src/environments/environment'

/**
 * PHASE 4.1: Session Timeout Service
 * Monitors session expiry and warns user before logout
 */
@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {
  private authService = inject(AuthService)
  private snackbar = inject(MatSnackBar)
  private destroyRef = inject(DestroyRef)

  // Configuration
  private readonly SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
  private readonly WARNING_BEFORE_MS = 3 * 24 * 60 * 60 * 1000 // 3 days
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000 // Check every hour

  readonly sessionExpiry = signal<Date | null>(null)
  readonly timeUntilExpiry = signal<number>(0)
  readonly showWarning = signal(false)

  private checkInterval: Subscription | null = null
  private lastWarningTime = 0

  constructor() {
    // Auto-start monitoring when auth state changes.
    // Keep a single subscription and avoid deprecated effect() options.
    this.authService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          this.startMonitoring()
        } else {
          this.stopMonitoring()
        }
      })
  }

  private startMonitoring(): void {
    if (this.checkInterval) {
      return // Already monitoring
    }

    // Set session expiry to 30 days from now
    const expiryDate = new Date(Date.now() + this.SESSION_DURATION_MS)
    this.sessionExpiry.set(expiryDate)

    // Check every hour
    this.checkInterval = interval(this.CHECK_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.checkSessionExpiry()
      })

    // Initial check
    this.checkSessionExpiry()
  }

  private stopMonitoring(): void {
    if (this.checkInterval) {
      this.checkInterval.unsubscribe()
      this.checkInterval = null
    }
    this.sessionExpiry.set(null)
    this.showWarning.set(false)
  }

  private checkSessionExpiry(): void {
    const expiry = this.sessionExpiry()
    if (!expiry) {
      return
    }

    const now = Date.now()
    const timeUntilExpiry = expiry.getTime() - now

    this.timeUntilExpiry.set(Math.max(0, timeUntilExpiry))

    // Show warning if less than 3 days remaining and not already warned recently
    if (timeUntilExpiry < this.WARNING_BEFORE_MS && timeUntilExpiry > 0) {
      const timeSinceLastWarning = now - this.lastWarningTime
      if (timeSinceLastWarning > 24 * 60 * 60 * 1000) { // Only warn once per day
        this.showWarning.set(true)
        this.lastWarningTime = now

        const daysRemaining = Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000))
        this.snackbar.open(
          `Your session will expire in ${daysRemaining} days. Please refresh to extend your session.`,
          'Refresh Now',
          { duration: 8000 }
        ).onAction().subscribe(() => this.refreshSession())
      }
    }

    // Session expired
    if (timeUntilExpiry <= 0) {
      this.sessionExpiry.set(null)
      this.showWarning.set(false)
      this.snackbar.open(
        'Your session has expired. Please log in again.',
        'Log In',
        { duration: 0 }
      ).onAction().subscribe(() => this.authService.logout().subscribe())
    }
  }

  refreshSession(): void {
    // Extend session by 30 days
    const newExpiry = new Date(Date.now() + this.SESSION_DURATION_MS)
    this.sessionExpiry.set(newExpiry)
    this.showWarning.set(false)
    this.snackbar.open(
      'Session extended for 30 more days',
      '',
      { duration: 3000 }
    )
  }

  getFormattedTimeRemaining(): string {
    const ms = this.timeUntilExpiry()
    if (ms <= 0) return 'Expired'

    const days = Math.floor(ms / (24 * 60 * 60 * 1000))
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }
}
