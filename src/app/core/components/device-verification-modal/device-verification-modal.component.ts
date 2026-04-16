import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { DeviceVerificationService } from '../../services/device-verification.service'
import { AuthService } from '../../services/auth.service'
import { firstValueFrom } from 'rxjs'

/**
 * PHASE 4.2: Device Verification Modal Component
 * Verifies new devices via email/SMS confirmation code
 */
@Component({
  selector: 'app-device-verification-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './device-verification-modal.component.html',
  styleUrl: './device-verification-modal.component.scss'
})
export class DeviceVerificationModalComponent implements OnInit, OnDestroy {
  private deviceVerification = inject(DeviceVerificationService)
  private auth = inject(AuthService)
  private snackBar = inject(MatSnackBar)
  private dialogRef = inject(MatDialogRef<DeviceVerificationModalComponent>)

  readonly verificationSent = signal(false)
  readonly verificationMethod = signal<'email' | 'sms'>('email')
  readonly verificationExpiry = signal<Date | null>(null)
  readonly isSending = signal(false)
  readonly isVerifying = signal(false)
  readonly timeRemaining = signal('00:00')

  codeInput = ''
  deviceName = ''
  private countdownIntervalId: ReturnType<typeof setInterval> | null = null

  ngOnInit() {
    // Set up interval to update countdown
    this.countdownIntervalId = setInterval(() => {
      if (this.verificationExpiry()) {
        const remaining = this.getTimeRemaining()
        this.timeRemaining.set(remaining)

        // Expire if time is up
        if (remaining === '00:00') {
          if (this.countdownIntervalId) {
            clearInterval(this.countdownIntervalId)
            this.countdownIntervalId = null
          }
          this.verificationSent.set(false)
          this.snackBar.open('Code expired. Please request a new one.', 'Dismiss', { duration: 5000 })
        }
      }
    }, 1000)
  }

  ngOnDestroy(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId)
      this.countdownIntervalId = null
    }
  }

  async sendCode(method: 'email' | 'sms') {
    this.isSending.set(true)
    const user = await firstValueFrom(this.auth.user$, { defaultValue: null })
    const userId = user?.uid
    if (!userId) {
      this.snackBar.open('User not found', 'Dismiss', { duration: 5000 })
      this.isSending.set(false)
      return
    }

    const result = await this.deviceVerification.sendVerificationCode(userId, method)
    this.isSending.set(false)

    if (result.success) {
      this.verificationMethod.set(method)
      this.verificationExpiry.set(this.deviceVerification.verificationExpiry())
      this.verificationSent.set(true)
      this.snackBar.open(result.message || `Code sent to your ${method}`, 'Dismiss', { duration: 5000 })
    } else {
      this.snackBar.open(result.message || 'Failed to send verification code', 'Dismiss', { duration: 5000 })
    }
  }

  async verify() {
    this.isVerifying.set(true)
    const user = await firstValueFrom(this.auth.user$, { defaultValue: null })
    const userId = user?.uid
    if (!userId) {
      this.snackBar.open('User not found', 'Dismiss', { duration: 5000 })
      this.isVerifying.set(false)
      return
    }

    const success = await this.deviceVerification.verifyDevice(userId, this.codeInput, this.deviceName || 'Unknown Device')
    this.isVerifying.set(false)

    if (success) {
      this.snackBar.open('Device verified successfully!', 'Dismiss', { duration: 3000 })
      this.close()
    } else {
      this.snackBar.open('Invalid verification code', 'Dismiss', { duration: 5000 })
    }
  }

  getTimeRemaining(): string {
    if (!this.verificationExpiry()) return '00:00'

    const now = new Date().getTime()
    const expiry = this.verificationExpiry()!.getTime()
    const diff = Math.max(0, expiry - now)
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  close() {
    this.dialogRef.close()
  }
}
