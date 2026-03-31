import { isPlatformBrowser, JsonPipe, NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, DOCUMENT, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, ConfirmationResult, GithubAuthProvider, GoogleAuthProvider, MultiFactorInfo, RecaptchaVerifier, TotpSecret, updateProfile, UserCredential, UserInfo } from '@angular/fire/auth';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { from } from 'rxjs/internal/observable/from';
import { SnackBarType, StinputComponent } from 'src/app/core/components';
import { createPasswordStrengthValidator, RippleDirective } from 'src/app/core/directives';
import { checkPasswordStrength, getErrorLabel, getErrorMessage } from 'src/app/core/functions';
import { FormControlPipe } from 'src/app/core/pipes';
import { AuthService, FirestoreService, LocalStorage, SnackbarService } from 'src/app/core/services';
import { Loading, loginHistoryInfo, Users } from 'src/app/core/types';
import { DEFAULT_PROFILE_URL } from 'src/app/core/variables';
import { myIcons, OtpInputComponent, themeStorageKey } from 'src/app/shared';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-security-tab',
  imports: [ReactiveFormsModule, StinputComponent, FormControlPipe, MatIcon, RippleDirective, UpperCasePipe, MatProgressSpinnerModule, LucideAngularModule, NgClass, OtpInputComponent],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityTabComponent {

  readonly icons = myIcons
  user: Users & { currProviderData: UserInfo | null } | null = null

  remProviders: string[]
  loginProviders: string[]

  loading: Loading = {
    github: false,
    google: false,
    logout: false,
    password: false,
    code: false,
    phone: false,
    email: false,
    mfa: false,
    remove: false
  }
  securityForm: FormGroup
  private localStorage = inject(LocalStorage)
  private route = inject(ActivatedRoute)
  private destroyRef = inject(DestroyRef)

  private authService = inject(AuthService)
  private firestoreService = inject(FirestoreService)
  private snackbarService = inject(SnackbarService)
  private translate = inject(TranslateService)

  themeDarkMode: boolean

  hasProviderPassword = signal<{provider: string, has: boolean}>({provider: '', has: false})

  // ── Phone 2FA inline verification ──────────────────────────────────────────
  phoneStep = signal<'idle' | 'enter-number' | 'enter-code'>('idle')
  phoneError = signal('')
  readonly phoneNumber = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)] })
  readonly otpControl = new FormControl('', { nonNullable: true })
  readonly totpCode = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] })
  readonly totpDisplayName = new FormControl('Authenticator app', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] })
  private recaptchaVerifier!: RecaptchaVerifier
  private confirmationResult!: ConfirmationResult
  private pendingTotpSecret: TotpSecret | null = null
  private readonly platformId = inject(PLATFORM_ID)
  private readonly document = inject(DOCUMENT)
  private readonly fireAuth = inject(Auth)
  readonly totpStep = signal<'idle' | 'verify'>('idle')
  readonly totpError = signal('')
  readonly totpSecretKey = signal('')
  readonly totpQrUrl = signal('')
  readonly totpFactors = signal<readonly MultiFactorInfo[]>([])
  readonly activeSessions = signal<loginHistoryInfo[]>([])
  readonly sessionsLoading = signal(false)
  readonly sessionsError = signal('')
  readonly revokingSessionId = signal('')
  readonly currentSessionId = signal('')


  public get email() {
    return this.securityForm.get('email')
  }

  public get password() {
    return this.securityForm.get('password')
  }

  constructor(private cdr: ChangeDetectorRef, private fb: FormBuilder,) {

    this.themeDarkMode = this.localStorage?.getItem(themeStorageKey) === 'true'
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.initSecurityForm()
    this.initProviders()
  }


  private initSecurityForm() {

    // set user data from resolver
    this.initUser()

    // initialize form
    this.securityForm = this.fb.group({

      email: this.fb.control<string>(this.user?.email ?? '',
        {
          updateOn: 'change', //default will be change
          validators: [
            Validators.required,
            Validators.email,
            Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')
          ]
        }),
      password: this.fb.control<string>('', {
        updateOn: 'change', //default will be
        nonNullable: true,
        validators: [
          Validators.minLength(8),
          // Strong Password Validation
          createPasswordStrengthValidator(),
          // Strong Password Validation
          // forbiddenNameValidator(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/i)
        ]
      })
    })

    this.email?.disable()
  }

  initUser() {
    this.user = this.route.snapshot.data['user']
    this.hasProviderPassword.set({provider: this.user?.providerId || '', 
      has: this.user?.providerData.some(p => p.providerId === 'password') ?? false})
    this.syncTotpFactors()
    this.resolveCurrentSessionId()
    this.loadActiveSessions()
  }

  private resolveCurrentSessionId(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.currentSessionId.set('')
      return
    }

    try {
      const cookiePairs = this.document.cookie
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part.startsWith('aid='))

      const aidRaw = cookiePairs.length > 0 ? decodeURIComponent(cookiePairs[0].slice(4)) : ''
      const aidData = aidRaw ? JSON.parse(aidRaw) as { loginId?: string } : null
      const loginId = aidData?.loginId || this.localStorage.getItem('loginId') || ''
      this.currentSessionId.set(loginId)
    } catch {
      this.currentSessionId.set(this.localStorage.getItem('loginId') || '')
    }
  }

  loadActiveSessions(): void {
    if (!this.user?.uid) {
      this.activeSessions.set([])
      return
    }

    this.sessionsLoading.set(true)
    this.sessionsError.set('')

    this.firestoreService.getMyLoginSessions(25)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sessions) => {
          this.activeSessions.set(sessions || [])
          this.sessionsLoading.set(false)
          this.cdr.detectChanges()
        },
        error: (error) => {
          this.sessionsLoading.set(false)
          this.sessionsError.set(getErrorMessage(error, this.translate))
          this.cdr.detectChanges()
        }
      })
  }

  isCurrentSession(session: loginHistoryInfo & { id?: string }): boolean {
    return !!session?.id && session.id === this.currentSessionId()
  }

  canRevokeSession(session: loginHistoryInfo): boolean {
    return session.connected === true && !session.revokedAt && !session.signOutTime
  }

  formatSessionTimestamp(session: loginHistoryInfo): string {
    const dateValue = this.asDate((session as any)?.timestamp)
    return dateValue ? dateValue.toLocaleString() : 'Unknown time'
  }

  async revokeSession(session: loginHistoryInfo & { id?: string }): Promise<void> {
    const loginId = session?.id || ''
    if (!loginId || this.revokingSessionId()) return

    this.revokingSessionId.set(loginId)
    this.sessionsError.set('')
    this.cdr.detectChanges()

    this.firestoreService.revokeMyLoginSession(loginId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSnackbar('Session revoked successfully', SnackBarType.success, '', 3000)
          if (loginId === this.currentSessionId()) {
            this.authService.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              complete: () => {
                this.revokingSessionId.set('')
                this.cdr.detectChanges()
              }
            })
            return
          }

          this.revokingSessionId.set('')
          this.loadActiveSessions()
          this.cdr.detectChanges()
        },
        error: (error) => {
          this.revokingSessionId.set('')
          this.sessionsError.set(getErrorMessage(error, this.translate))
          this.cdr.detectChanges()
        }
      })
  }

  private asDate(input: any): Date | null {
    if (!input) return null
    if (input instanceof Date) return input
    if (typeof input?.toDate === 'function') return input.toDate()
    if (typeof input?.seconds === 'number') return new Date(input.seconds * 1000)
    if (typeof input === 'string' || typeof input === 'number') {
      const date = new Date(input)
      return isNaN(date.getTime()) ? null : date
    }
    return null
  }

  initProviders() {
    const providersData = this.user?.providerData.map(p => p.providerId.replace('.com', ''))
    this.remProviders = providersData?.filter(p => p !== 'password') ?? []
    this.loginProviders = ['google', 'github'].filter(p => !this.remProviders.includes(p))
  }


  linkLoginProvider(provider: string) {
    console.log('linkLoginProvider', provider)

    switch (provider) {
      case 'google':
        this.linkWithGoogle()
        break
      case 'github':
        this.linkWithGitHub()
        break
      default:
        break
    }

  }

  private linkWithGoogle() {
    this.loading.google = true;
    const provider = new GoogleAuthProvider()
    provider.addScope("email")
    provider.addScope("profile")
    provider.addScope("openid")

    provider.setCustomParameters({ prompt: 'select_account' })
    from(this.authService.linkProvider(provider))

      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        {
          next: async (response) => {

            if (response && response.user) {
              // this.pendingCredential = GoogleAuthProvider.credentialFromResult(response.result);
              // If there's a pending credential from a previous social login attempt, link it now
              // const userCredential =  await this.handlePendingCredentialLinking(response.user)
              // response.user = userCredential?.user || response.user
              if (response.user.displayName || response.user.photoURL) {
                await updateProfile(response.user, {
                  displayName: response.user.displayName,
                  photoURL: response.user.photoURL ? response.user.photoURL : DEFAULT_PROFILE_URL,

                })
              }
              await this.firestoreService.storeUserData(response.user, this.user?.providerId || 'google.com', true, this.user?.username)
              // this.authService.initAuth()
              // refresh providers data instead of re-init whole auth state
              this.loginProviders = this.loginProviders.filter(p => p !== 'google')
              this.remProviders.push('google')
              this.showSnackbar('Google provider linked Sucessfully', SnackBarType.success, '', 3000)
              this.cdr.detectChanges()
            }
          },
          error: (error) => {
            // this.extractFirebaseError(error)
            // this.handleAccountExistsError(error, 'google.com')
            const errorMessage = getErrorMessage(error, this.translate)
            this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
            this.loading.google = false
            this.cdr.detectChanges()
          },
          complete: () => {
            this.loading.google = false
            this.cdr.detectChanges()
          }
        }
      )
  }

  private linkWithGitHub() {
    this.loading.github = true;

    const provider = new GithubAuthProvider();
    provider.addScope('user:email')
    provider.addScope('read:user')
    provider.setCustomParameters({ prompt: 'select_account' })


    from(this.authService.linkProvider(provider))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        {
          next: async (response) => {

            if (response && response.user) {
              // this.pendingCredential = GithubAuthProvider.credentialFromResult(response.result);
              // If there's a pending credential from a previous social login attempt, link it now
              // const userCredential =  await this.handlePendingCredentialLinking(response.user)
              // response.user = userCredential?.user || response.user

              if (response.user.displayName || response.user.photoURL) {
                await updateProfile(response.user, {
                  displayName: response.user.displayName,
                  photoURL: response.user.photoURL ? response.user.photoURL : DEFAULT_PROFILE_URL,
                })
              }
              await this.firestoreService.storeUserData(response.user, this.user?.providerId || 'github.com', true, this.user?.username)
              // this.authService.initAuth()

              // refresh providers data instead of re-init whole auth state
              this.loginProviders = this.loginProviders.filter(p => p !== 'github')
              this.remProviders.push('github')
              this.showSnackbar('Github provider linked Sucessfully', SnackBarType.success, '', 3000)
              this.cdr.detectChanges()
            }
          },
          error: (error) => {
            // this.extractFirebaseError(error)
            // this.handleAccountExistsError(error, 'github.com')
            const errorMessage = getErrorMessage(error, this.translate)
            this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
            this.loading.github = false
            this.cdr.detectChanges()
          },
          complete: () => {
            this.loading.github = false
            this.cdr.detectChanges()
          }
        }

      )
  }

  protected disconnectProvider(provider: string) {
    // Check if the provider to be unlinked is the currently logged-in provider
    const providerId = (provider !== 'password'? provider + '.com' : 'password')
    if (providerId === this.user?.providerId) {
      this.showSnackbar(
        `Cannot unlink the currently logged-in provider (${provider}).`,
        SnackBarType.error
      )
      return
    }

    if (provider !== 'password')
      this.loading[provider as 'github' | 'google'] = true
    else
      this.loading.email = (provider === 'password')

    from(this.authService.unlinkProvider(providerId))
      .pipe(
        takeUntilDestroyed(this.destroyRef) // Automatically unsubscribe when the component is destroyed
      )
      .subscribe({
        next: async () => {

          // Filter out the current provider from the providerData array
          const updatedProviderData = this.user?.providerData.filter(
            (p) => p.providerId !== providerId
          )

          // update user data in firestore
          if (this.user?.uid) {
            await this.firestoreService.setUserData(this.user.uid, { 
              providerData: updatedProviderData,
              updated_At: new Date() 
            }, true)
          } else {
            this.showSnackbar('User ID is missing.', SnackBarType.error, '', 5000)
          }

          if (updatedProviderData && this.user) {
            this.user = { ...this.user, providerData: updatedProviderData, currProviderData: null }
            this.hasProviderPassword.set({provider: this.user?.providerId || '', has: this.user?.providerData.some(p => p.providerId === 'password') ?? false})
          }
            

          if (provider === 'password')
            return          

          // Update the UI state after successful unlinking
          this.remProviders = this.remProviders.filter(p => p !== provider)
          this.loginProviders.push(provider)
          this.cdr.detectChanges()
        },
        error: (error) => {
          if (provider !== 'password')
            this.loading[provider as 'github' | 'google'] = false
          else
            this.loading.email = !(provider === 'password')

          // Handle errors and show an error message
          const errorMessage = getErrorMessage(error, this.translate);
          this.showSnackbar(errorMessage, SnackBarType.error, '', 5000);
          this.cdr.detectChanges()
        },
        complete: () => {
          if (provider !== 'password')
            this.loading[provider as 'github' | 'google' ] = false
          else
            this.loading.email = !(provider === 'password')
          this.showSnackbar(`${provider} provider disconnected`, SnackBarType.success, '', 3000);
          this.cdr.detectChanges()
        }
      })
  }

  setPassword() {

    const newPassword = this.password?.value
    if (!newPassword) {
      // this.securityForm.markAllAsTouched()
      // this.cdr.detectChanges()
      return
    }
    const userId = this.user?.uid || '' 
    this.loading.password = true
    from(this.authService.updatePassword(newPassword))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (userCredential) => {

          try {
                if (userCredential)
                  await this.firestoreService.setUserData(userId, { providerData: userCredential.user.providerData, updated_At: new Date() }, true)

                const newUser= await this.authService.refreshUserData(userId)
          
                if (newUser)
                  this.user = newUser
          }
          catch (error) {
            console.error('Error updating user data after password change:', error)
          }
          
         
          this.password?.reset() 
          this.cdr.detectChanges()
        },
        error: (error) => {
          const errorMessage = getErrorMessage(error, this.translate)
          this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
          this.loading.password = false
          this.cdr.detectChanges()
        },
        complete: () => {
          this.loading.password = false
          this.showSnackbar('Password changed successfully!', SnackBarType.success, '', 3000)
          this.cdr.detectChanges()
        }
      })
  }

  onSubmit() {

  }

  async startTotpSetup(): Promise<void> {
    if (this.loading.mfa) return

    this.loading.mfa = true
    this.totpError.set('')
    this.cdr.detectChanges()

    try {
      const enrollment = await this.authService.startTotpEnrollment()
      this.pendingTotpSecret = enrollment.secret
      this.totpSecretKey.set(enrollment.secretKey)
      this.totpQrUrl.set(enrollment.qrCodeUrl)
      this.totpCode.reset('')
      this.totpStep.set('verify')
    } catch (error: any) {
      this.totpError.set(getErrorMessage(error, this.translate))
    } finally {
      this.loading.mfa = false
      this.cdr.detectChanges()
    }
  }

  async completeTotpSetup(): Promise<void> {
    if (!this.pendingTotpSecret || this.totpCode.invalid || this.loading.mfa) return

    this.loading.mfa = true
    this.totpError.set('')
    this.cdr.detectChanges()

    try {
      await this.authService.completeTotpEnrollment(
        this.pendingTotpSecret,
        this.totpCode.value,
        this.totpDisplayName.value
      )
      this.pendingTotpSecret = null
      this.totpStep.set('idle')
      this.totpCode.reset('')
      this.totpSecretKey.set('')
      this.totpQrUrl.set('')
      this.syncTotpFactors()
      this.showSnackbar('Authenticator app enrolled successfully', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.totpError.set(getErrorMessage(error, this.translate))
    } finally {
      this.loading.mfa = false
      this.cdr.detectChanges()
    }
  }

  cancelTotpSetup(): void {
    this.pendingTotpSecret = null
    this.totpStep.set('idle')
    this.totpError.set('')
    this.totpCode.reset('')
    this.totpSecretKey.set('')
    this.totpQrUrl.set('')
    this.cdr.detectChanges()
  }

  async removeTotpFactor(factorUid: string): Promise<void> {
    if (this.loading.mfa) return

    this.loading.mfa = true
    this.totpError.set('')
    this.cdr.detectChanges()

    try {
      await this.authService.unenrollMultiFactor(factorUid)
      this.syncTotpFactors()
      this.showSnackbar('Authenticator app removed', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.totpError.set(getErrorMessage(error, this.translate))
    } finally {
      this.loading.mfa = false
      this.cdr.detectChanges()
    }
  }

  private syncTotpFactors(): void {
    const factors = this.authService.getEnrolledMultiFactorHints()
      .filter((factor) => factor.factorId === 'totp')

    this.totpFactors.set(factors)
  }


  darkMode() {

    return this.themeDarkMode ? '_dark' : ''

  }


  protected checkPasswordStrength(password: string): string {
      return checkPasswordStrength(password)
  }

  getErrorLabel(controlName: string): string | undefined {
      return getErrorLabel(this.securityForm, controlName)
    }
  


  // 'info' | 'success' | 'warning' | 'error'
  private showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return
    this.initRecaptcha()
  }

  private initRecaptcha(): void {
    const el = this.document.getElementById('recaptcha-security')
    if (!el) return
    this.recaptchaVerifier = new RecaptchaVerifier(this.fireAuth, 'recaptcha-security', { size: 'invisible' })
    this.recaptchaVerifier.render()
  }

  openPhoneAdd(): void {
    this.phoneStep.set('enter-number')
    this.phoneError.set('')
    this.phoneNumber.reset('')
    this.otpControl.reset('')
    this.cdr.detectChanges()
  }

  async sendPhoneCode(): Promise<void> {
    if (this.phoneNumber.invalid || this.loading.phone) return
    this.loading.phone = true
    this.phoneError.set('')
    this.cdr.detectChanges()
    try {
      this.confirmationResult = await this.authService.linkPhoneNumber(
        this.phoneNumber.value, this.recaptchaVerifier
      )
      this.phoneStep.set('enter-code')
      this.otpControl.reset('')
    } catch (error: any) {
      this.phoneError.set(getErrorMessage(error, this.translate))
      try { this.recaptchaVerifier.clear() } catch { /* ignore */ }
      this.initRecaptcha()
    } finally {
      this.loading.phone = false
      this.cdr.detectChanges()
    }
  }

  async verifyPhoneOtp(code: string): Promise<void> {
    if (!code || code.length < 6 || !this.confirmationResult || this.loading.code) return
    this.loading.code = true
    this.phoneError.set('')
    this.cdr.detectChanges()
    try {
      const result = await this.authService.completePhoneVerification(this.confirmationResult, code)
      if (result?.user) {
        const newUser = await this.authService.refreshUserData(result.user.uid)
        if (newUser) this.user = newUser
        this.phoneStep.set('idle')
        this.showSnackbar('Phone number verified and linked!', SnackBarType.success, '', 3000)
      }
    } catch (error: any) {
      this.phoneError.set(getErrorMessage(error, this.translate))
      this.otpControl.reset('')
    } finally {
      this.loading.code = false
      this.cdr.detectChanges()
    }
  }

  cancelPhoneVerification(): void {
    this.phoneStep.set('idle')
    this.phoneError.set('')
    this.phoneNumber.reset('')
    this.otpControl.reset('')
    this.cdr.detectChanges()
  }

  async removePhoneNumber(): Promise<void> {
    this.loading.remove = true
    this.cdr.detectChanges()
    try {
      await this.authService.unlinkProvider('phone')
      if (this.user?.uid) {
        await this.authService.updatePhoneVerificationStatus(this.user.uid).toPromise()
      }
      const newUser = await this.authService.refreshUserData(this.user?.uid ?? '')
      if (newUser) this.user = newUser
      this.showSnackbar('Phone number removed', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.showSnackbar(getErrorMessage(error, this.translate), SnackBarType.error, '', 5000)
    } finally {
      this.loading.remove = false
      this.cdr.detectChanges()
    }
  }

  ngOnDestroy(): void {
    if (this.recaptchaVerifier) {
      try { this.recaptchaVerifier.clear() } catch { /* ignore */ }
    }
  }

}
