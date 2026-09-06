import { CommonModule } from '@angular/common'
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { SnackBarType } from 'src/app/core/components'
import { resolveSafeReturnUrl } from 'src/app/core/functions'
import { AuthService, DeviceVerificationService, SnackbarService } from 'src/app/core/services'
import { Auth, PhoneAuthProvider, RecaptchaVerifier, reauthenticateWithCredential } from '@angular/fire/auth'

@Component({
  selector: 'app-device-verification-route',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './device-verification.component.html',
  styleUrl: './device-verification.component.scss',
})
export class DeviceVerificationRouteComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService)
  private deviceVerification = inject(DeviceVerificationService)
  private snackbarService = inject(SnackbarService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private fireAuth = inject(Auth)

  readonly verificationSent = signal(false)
  readonly verificationMethod = signal<'email' | 'sms'>('email')
  readonly verificationExpiry = signal<Date | null>(null)
  readonly isSending = signal(false)
  readonly isVerifying = signal(false)
  readonly timeRemaining = signal('00:00')
  readonly infoMessage = signal('')
  readonly action = signal<string | null>(null)
  readonly sessionId = signal<string | undefined>(undefined)
  readonly mfaPhoneOtp = signal('')
  readonly mfaVerificationId = signal<string | null>(null)
  readonly showMfaInput = signal(false)
  readonly isMfaSending = signal(false)

  codeInput = ''
  deviceName = ''

  private countdownIntervalId: ReturnType<typeof setInterval> | null = null
  private currentUserId = ''

  /** Human-readable label for the current action context. */
  get actionLabel(): string {
    switch (this.action()) {
      case 'unlink_provider': return 'unlink a provider'
      case 'api_key_reveal': return 'reveal an API key'
      case 'billing_change': return 'make billing changes'
      case 'login': return 'sign in'
      default: return 'continue'
    }
  }

  /** Whether the verification is for a login flow (vs a high-risk action). */
  get isLoginFlow(): boolean {
    return this.action() === 'login' || this.action() === null
  }

  resendCurrentChannel(): Promise<void> {
    const channel = this.verificationMethod() === 'sms' ? 'sms' : 'email'
    return this.sendCode(channel)
  }

  switchChannel(): Promise<void> {
    const newChannel = this.verificationMethod() === 'sms' ? 'email' : 'sms'
    this.verificationSent.set(false)
    this.infoMessage.set('')
    return this.sendCode(newChannel)
  }

  async ngOnInit(): Promise<void> {
    const user = await firstValueFrom(this.authService.user$, { defaultValue: null })
    const userId = user?.uid

    if (!userId) {
      await this.router.navigate(['/service/login'], { queryParams: { returnUrl: this.getReturnUrl() } })
      return
    }

    this.currentUserId = userId
    this.deviceName = this.getDefaultDeviceName()

    // Read action and sessionId from query params
    this.action.set(this.route.snapshot.queryParamMap.get('action') || 'login')
    const qpSessionId = this.route.snapshot.queryParamMap.get('sessionId')
    if (qpSessionId) {
      this.sessionId.set(qpSessionId)
    }

    const fingerprint = this.deviceVerification.getDeviceFingerprint()
    const trusted = await this.deviceVerification.isDeviceTrusted(userId, fingerprint)

    if (trusted) {
      await this.router.navigateByUrl(this.getReturnUrl())
      return
    }

    this.countdownIntervalId = setInterval(() => {
      if (!this.verificationExpiry()) {
        return
      }

      const remaining = this.getTimeRemaining()
      this.timeRemaining.set(remaining)

      if (remaining === '00:00') {
        this.verificationSent.set(false)
        this.infoMessage.set('Verification code expired. Request a new code to continue.')
      }
    }, 1000)

    await this.sendCode('auto')
  }

  ngOnDestroy(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId)
      this.countdownIntervalId = null
    }
  }

  async sendCode(method: 'email' | 'sms' | 'auto'): Promise<void> {
    if (!this.currentUserId) {
      return
    }

    this.isSending.set(true)
    this.infoMessage.set('')

    try {
      const result = await this.deviceVerification.sendVerificationCode(this.currentUserId, method, this.sessionId())

      if (!result.success) {
        this.snackbarService.showSnackbar(result.message || 'Failed to send verification code', SnackBarType.error, '', 5000)
        return
      }

      const effectiveMethod = result.method || (method === 'sms' ? 'sms' : 'email')
      this.verificationMethod.set(effectiveMethod)
      this.verificationExpiry.set(this.deviceVerification.verificationExpiry())
      this.verificationSent.set(true)

      if (effectiveMethod === 'sms' && result.deliveryStatus === 'pending_client_mfa') {
        this.infoMessage.set(result.message || 'Initiating phone verification...')
        // Auto-trigger Firebase phone verification
        this.initMfaPhoneChallenge()
      } else if (!this.infoMessage()) {
        this.infoMessage.set(result.message || 'Verification code sent successfully.')
      }

      this.snackbarService.showSnackbar(this.infoMessage(), SnackBarType.info, '', 4500)
    } finally {
      this.isSending.set(false)
    }
  }

  async verify(): Promise<void> {
    if (!this.currentUserId || this.codeInput.trim().length !== 6) {
      return
    }

    this.isVerifying.set(true)

    try {
      const success = await this.deviceVerification.verifyDevice(
        this.currentUserId,
        this.codeInput.trim(),
        (this.deviceName || this.getDefaultDeviceName()).trim(),
        this.sessionId(),
      )

      if (!success) {
        this.snackbarService.showSnackbar('Invalid verification code. Check the code and try again.', SnackBarType.error, '', 5000)
        return
      }

      this.snackbarService.showSnackbar('Device verified. Sign in completed.', SnackBarType.success, '', 3000)
      await this.router.navigateByUrl(this.getReturnUrl())
    } finally {
      this.isVerifying.set(false)
    }
  }

  /**
   * Initiate Firebase phone MFA challenge for SMS delivery.
   * Uses PhoneAuthProvider to send an SMS via Firebase client SDK.
   */
  private async initMfaPhoneChallenge(): Promise<void> {
    try {
      this.isMfaSending.set(true)
      this.showMfaInput.set(false)

      const user = await firstValueFrom(this.authService.user$, { defaultValue: null })
      if (!user?.phoneNumber) {
        this.showMfaInput.set(false)
        this.infoMessage.set('No phone number on your account. Use email verification instead.')
        return
      }

      // Create reCAPTCHA verifier
      const recaptchaVerifier = new RecaptchaVerifier(
        this.fireAuth,
        'mfa-recaptcha-container',
        { size: 'invisible' },
      )
      await recaptchaVerifier.render()

      // Send SMS via Firebase PhoneAuthProvider
      const phoneProvider = new PhoneAuthProvider(this.fireAuth)
      const verificationId = await phoneProvider.verifyPhoneNumber(user.phoneNumber, recaptchaVerifier)

      this.mfaVerificationId.set(verificationId)
      this.showMfaInput.set(true)
      this.infoMessage.set(`SMS sent to ${user.phoneNumber.slice(0, -4)}****. Enter the code from your phone.`)
    } catch (error) {
      console.error('Failed to initiate phone MFA challenge:', error)
      this.showMfaInput.set(false)
      this.infoMessage.set('Could not send SMS. Use email verification instead by switching to email.')
    } finally {
      this.isMfaSending.set(false)
    }
  }

  /**
   * Complete the phone MFA challenge with the user-entered OTP,
   * then trust the device via the backend (skipping custom code check).
   */
  async verifyPhoneMfa(): Promise<void> {
    const otp = this.mfaPhoneOtp()
    if (!otp || otp.length < 6 || !this.mfaVerificationId()) {
      return
    }

    this.isVerifying.set(true)
    this.infoMessage.set('Verifying phone code...')

    try {
      // Complete Firebase phone verification
      const credential = PhoneAuthProvider.credential(this.mfaVerificationId()!, otp)

      // Reauthenticate to prove phone ownership
      const firebaseUser = this.fireAuth.currentUser
      if (firebaseUser) {
        await reauthenticateWithCredential(firebaseUser, credential)
      }

      // Phone MFA succeeded — trust the device with mfaVerified flag
      const success = await this.deviceVerification.verifyDevice(
        this.currentUserId,
        'MFA_VERIFIED',
        (this.deviceName || this.getDefaultDeviceName()).trim(),
        this.sessionId(),
        true,  // mfaVerified
      )

      if (success) {
        this.snackbarService.showSnackbar('Device verified via phone.', SnackBarType.success, '', 3000)
        await this.router.navigateByUrl(this.getReturnUrl())
      } else {
        this.snackbarService.showSnackbar('Phone verification succeeded but device trust failed.', SnackBarType.error, '', 5000)
        this.showMfaInput.set(false)
      }
    } catch (error) {
      console.error('Phone MFA verification failed:', error)
      this.snackbarService.showSnackbar('Invalid phone code. Try again or switch to email.', SnackBarType.error, '', 5000)
    } finally {
      this.isVerifying.set(false)
    }
  }

  async cancel(): Promise<void> {
    if (this.isLoginFlow) {
      await firstValueFrom(this.authService.logout())
      await this.router.navigate(['/service/login'])
    } else {
      await this.router.navigateByUrl(this.getReturnUrl())
    }
  }

  getTimeRemaining(): string {
    const expiry = this.verificationExpiry()
    if (!expiry) {
      return '00:00'
    }

    const diff = Math.max(0, expiry.getTime() - Date.now())
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  private getDefaultDeviceName(): string {
    if (typeof navigator === 'undefined') {
      return 'Unknown device'
    }

    const ua = navigator.userAgent || ''
    if (/mobile/i.test(ua)) {
      return 'Mobile device'
    }
    if (/tablet|ipad/i.test(ua)) {
      return 'Tablet'
    }
    return 'Desktop browser'
  }

  private getReturnUrl(): string {
    return resolveSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'))
  }
}
