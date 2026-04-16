import { isPlatformBrowser, JsonPipe, NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, DOCUMENT, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, ConfirmationResult, GithubAuthProvider, GoogleAuthProvider, MultiFactorInfo, MultiFactorResolver, RecaptchaVerifier, TotpSecret, updateProfile, UserCredential, UserInfo } from '@angular/fire/auth';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { from } from 'rxjs/internal/observable/from';
import { firstValueFrom } from 'rxjs';
import { DialogComponent, RadioToggleComponent, SnackBarType, StinputComponent } from 'src/app/core/components';
import { createPasswordStrengthValidator, RippleDirective } from 'src/app/core/directives';
import { checkPasswordStrength, getErrorLabel, getErrorMessage } from 'src/app/core/functions';
import { FormControlPipe } from 'src/app/core/pipes';
import { AuthService, FirestoreService, LocalStorage, SnackbarService } from 'src/app/core/services';
import { Loading, loginHistoryEvent, loginHistoryInfo, Users, SessionDisplayInfo } from 'src/app/core/types';
import { DEFAULT_PROFILE_URL } from 'src/app/core/variables';
import { myIcons, OtpInputComponent, themeStorageKey } from 'src/app/shared';
import { TranslateService } from '@ngx-translate/core';

type SecurityTimelineEvent = loginHistoryEvent & {
  occurredAt: Date | null
  sessionId: string
  locationLabel: string
  browserLabel: string
  osLabel: string
}

@Component({
  selector: 'app-security-tab',
  imports: [ReactiveFormsModule, StinputComponent, FormControlPipe, MatIcon, RippleDirective, UpperCasePipe, MatProgressSpinnerModule, LucideAngularModule, NgClass, OtpInputComponent, RadioToggleComponent, DialogComponent],
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
  accountPhoneStep = signal<'idle' | 'enter-number' | 'enter-code'>('idle')
  accountPhoneError = signal('')
  readonly phoneNumber = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)] })
  readonly otpControl = new FormControl('', { nonNullable: true })
  readonly accountPhoneNumber = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)] })
  readonly accountPhoneCode = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] })
  readonly mfaStatusControl = new FormControl(false, { nonNullable: true })
  readonly totpCode = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] })
  readonly totpDisplayName = new FormControl('Authenticator app', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] })
  private recaptchaVerifier!: RecaptchaVerifier
  private phoneMfaVerificationId = ''
  private accountPhoneConfirmationResult: ConfirmationResult | null = null
  private pendingTotpSecret: TotpSecret | null = null
  private readonly platformId = inject(PLATFORM_ID)
  private readonly document = inject(DOCUMENT)
  private readonly fireAuth = inject(Auth)
  readonly totpStep = signal<'idle' | 'verify'>('idle')
  readonly totpError = signal('')
  readonly totpSecretKey = signal('')
  readonly totpQrUrl = signal('')
  readonly totpFactors = signal<readonly MultiFactorInfo[]>([])
  readonly phoneMfaFactors = signal<readonly MultiFactorInfo[]>([])
  // PHASE 2.2: Updated type to SessionDisplayInfo for enterprise sessions
  readonly activeSessions = signal<SessionDisplayInfo[]>([])
  readonly sessionsLoading = signal(false)
  readonly sessionsError = signal('')
  readonly activityTimeline = signal<SecurityTimelineEvent[]>([])
  readonly activityLoading = signal(false)
  readonly activityError = signal('')
  readonly revokingSessionId = signal('')
  readonly currentSessionId = signal('')
  readonly confirmationDialog = signal<'disable-mfa' | 'revoke-current-session' | null>(null)
  readonly pendingSessionToRevoke = signal<(SessionDisplayInfo & { id?: string }) | null>(null)

  // ── MFA challenge state for provider linking (when user has MFA enabled) ──
  readonly mfaLinkResolver = signal<MultiFactorResolver | null>(null)
  readonly mfaLinkProvider = signal<'google' | 'github' | ''>('')
  readonly mfaLinkStep = signal<'idle' | 'phone-code' | 'totp-code'>('idle')
  readonly mfaLinkVerificationId = signal('')
  readonly mfaLinkPhoneHint = signal('')
  readonly mfaLinkPhoneFactorIndex = signal(0) // Track which phone factor we're trying
  readonly mfaLinkPhoneFactorAttempts = signal<{factorUid: string, phoneNumber: string, error: string}[]>([]) // Track failed attempts
  readonly mfaLinkOtp = new FormControl('', { nonNullable: true })
  readonly mfaLinkTotpCode = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] })
  readonly mfaLinkError = signal('')


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

    this.mfaStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        void this.onMfaStatusSelected(value)
      })
  }

  initUser() {
    this.user = this.route.snapshot.data['user']
    this.hasProviderPassword.set({provider: this.getCurrentProviderId(), 
      has: this.user?.providerData.some(p => p.providerId === 'password') ?? false})
    this.syncTotpFactors()
    this.resolveCurrentSessionId()
    this.loadActiveSessions()
    this.loadActivityTimeline()
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

    this.firestoreService.getMyLoginSessionsWithFallback(25)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sessions) => {
          // PHASE 2.2: Transform sessions to SessionDisplayInfo format
          const displaySessions: SessionDisplayInfo[] = (sessions || []).map((s: any) => {
            const createdDate = this.resolveSessionDate(s, [
              'createdAt',
              'timestamp',
              'lastSignInTime',
              'signInTime',
              'created_At',
              'updated_At',
            ])
            const lastActivityDate = this.resolveSessionDate(s, [
              'lastActivityAt',
              'updated_At',
              'timestamp',
              'lastSignInTime',
            ])
            const expiresDate = this.resolveSessionDate(s, ['expiresAt'])
            const location = this.resolveSessionLocation(s)
            const sessionId = this.resolveSessionId(s)
            return {
              sessionId,
              userId: s.userId || this.user?.uid || '',
              deviceId: s.deviceId || '',
              createdAt: createdDate || new Date(),
              lastActivityAt: lastActivityDate || createdDate || new Date(),
              expiresAt: expiresDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              revokedAt: s.revokedAt || null,
              active: s.active !== false && !s.revokedAt,
              ipAddress: s.ipAddress || '',
              userAgent: s.userAgent || '',
              browser: s.browser || '',
              os: s.os || '',
              location,
              providerId: s.providerId || 'firebase',
              isCurrent: this.isCurrentSession({ ...s, sessionId } as SessionDisplayInfo & { id?: string }),
              isRevoked: !!((s as any).revokedAt),
              isSignedOut: !!((s as any).signOutTime),
              deviceFingerprintMatch: false, // TODO: implement device fingerprint check
              humanReadableTime: createdDate ? createdDate.toLocaleString() : 'Unknown time'
            } as SessionDisplayInfo
          })
          this.activeSessions.set(displaySessions)
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

  loadActivityTimeline(): void {
    if (!this.user?.uid) {
      this.activityTimeline.set([])
      return
    }

    this.activityLoading.set(true)
    this.activityError.set('')

    this.firestoreService.getMyLoginHistoryEvents(20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events) => {
          const timeline = (events || []).map((event) => {
            const occurredAt = this.resolveSessionDate(event, [
              'createdAt',
              'timestamp',
              'signOutTime',
              'revokedAt',
            ])
            const browserLabel = this.getEventBrowser(event)
            const osLabel = this.getEventOS(event)

            return {
              ...event,
              occurredAt,
              sessionId: this.resolveEventSessionId(event),
              locationLabel: this.resolveSessionLocation(event),
              browserLabel,
              osLabel,
            }
          })

          this.activityTimeline.set(timeline)
          this.activityLoading.set(false)
          this.cdr.detectChanges()
        },
        error: (error) => {
          this.activityLoading.set(false)
          this.activityError.set(getErrorMessage(error, this.translate))
          this.cdr.detectChanges()
        }
      })
  }

  isCurrentSession(session: SessionDisplayInfo & { id?: string }): boolean {
    const sessionId = this.resolveSessionId(session)
    return !!sessionId && sessionId === this.currentSessionId()
  }

  canRevokeSession(session: SessionDisplayInfo): boolean {
    const connected = (session as any)?.connected ?? session.active
    const revokedAt = (session as any)?.revokedAt ?? session.revokedAt
    const signOutTime = (session as any)?.signOutTime ?? null
    return connected === true && !revokedAt && !signOutTime
  }

  formatSessionTimestamp(session: SessionDisplayInfo): string {
    // Use pre-formatted humanReadableTime from SessionDisplayInfo
    if (session.humanReadableTime && session.humanReadableTime !== 'Unknown time') {
      return session.humanReadableTime
    }
    const dateValue = this.resolveSessionDate(session as any, [
      'timestamp',
      'createdAt',
      'lastSignInTime',
      'signInTime',
      'created_At',
    ])
    return dateValue ? dateValue.toLocaleString() : 'Unknown time'
  }

  getDisplayBrowser(session: SessionDisplayInfo): string {
    const explicit = (session.browser || '').trim()
    if (explicit && explicit.toLowerCase() !== 'unknown') {
      return explicit
    }

    return this.detectBrowserFromUserAgent(session.userAgent || '')
  }

  getDisplayOS(session: SessionDisplayInfo): string {
    const explicit = (session.os || '').trim()
    if (explicit && explicit.toLowerCase() !== 'unknown') {
      return explicit
    }

    return this.detectOsFromUserAgent(session.userAgent || '')
  }

  async revokeSession(session: SessionDisplayInfo & { id?: string }): Promise<void> {
    const loginId = this.resolveSessionId(session)
    if (!loginId || this.revokingSessionId()) return

    if (this.isCurrentSession(session)) {
      this.openCurrentSessionRevokeDialog(session)
      return
    }

    this.runSessionRevoke(session)
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

  private resolveSessionId(session: any): string {
    return (
      session?.sessionId ||
      session?.loginId ||
      session?.id ||
      ''
    )
  }

  private resolveEventSessionId(event: loginHistoryEvent): string {
    return String(
      event.eventSessionId ||
      event.sessionKey ||
      event.id ||
      ''
    )
  }

  private resolveSessionDate(session: any, keys: string[]): Date | null {
    for (const key of keys) {
      const parsed = this.asDate(session?.[key])
      if (parsed) {
        return parsed
      }
    }
    return null
  }

  private resolveSessionLocation(session: any): string {
    const direct = String(session?.location || '').trim()
    if (direct && direct.toLowerCase() !== 'unknown') {
      return direct
    }

    const guestLocation = String(session?.guestInfo?.location || '').trim()
    if (guestLocation && guestLocation.toLowerCase() !== 'unknown') {
      return guestLocation
    }

    const country = String(session?.country || '').trim()
    const region = String(session?.region || '').trim()
    return [region, country].filter(Boolean).join(', ')
  }

  private detectBrowserFromUserAgent(userAgent: string): string {
    const ua = (userAgent || '').toLowerCase()
    if (ua.includes('edg')) return 'Edge'
    if (ua.includes('opr') || ua.includes('opera')) return 'Opera'
    if (ua.includes('firefox')) return 'Firefox'
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome'
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
    return 'Unknown browser'
  }

  private detectOsFromUserAgent(userAgent: string): string {
    const ua = (userAgent || '').toLowerCase()
    if (ua.includes('windows')) return 'Windows'
    if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS'
    if (ua.includes('android')) return 'Android'
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS'
    if (ua.includes('linux')) return 'Linux'
    return 'Unknown OS'
  }

  getActivityEventLabel(event: SecurityTimelineEvent): string {
    if (event.eventType === 'logout') return 'Signed out'
    if (event.eventType === 'revoke') return 'Session revoked'
    return 'Signed in'
  }

  getActivityEventTone(event: SecurityTimelineEvent): string {
    if (event.eventType === 'logout') return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
    if (event.eventType === 'revoke') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  }

  formatActivityTimestamp(event: SecurityTimelineEvent): string {
    return event.occurredAt ? event.occurredAt.toLocaleString() : 'Unknown time'
  }

  getActivitySummary(event: SecurityTimelineEvent): string {
    const location = event.locationLabel || 'Unknown location'
    return `${event.browserLabel} • ${event.osLabel} • ${location}`
  }

  isCurrentActivityEvent(event: SecurityTimelineEvent): boolean {
    return !!event.sessionId && event.sessionId === this.currentSessionId()
  }

  private getEventBrowser(event: loginHistoryEvent): string {
    const explicit = String(event.browser || '').trim()
    if (explicit && explicit.toLowerCase() !== 'unknown') {
      return explicit
    }

    return this.detectBrowserFromUserAgent(event.userAgent || '')
  }

  private getEventOS(event: loginHistoryEvent): string {
    const explicit = String(event.os || '').trim()
    if (explicit && explicit.toLowerCase() !== 'unknown') {
      return explicit
    }

    return this.detectOsFromUserAgent(event.userAgent || '')
  }

  initProviders() {
    const providersData = this.user?.providerData
      .map((provider) => this.toUiProviderKey(provider.providerId))
      .filter((provider): provider is string => !!provider)

    // Connected Providers section only supports unlinking SSO providers here.
    this.remProviders = providersData?.filter((provider) => provider === 'google' || provider === 'github') ?? []
    this.loginProviders = ['google', 'github'].filter(p => !this.remProviders.includes(p))
  }

  private toFirebaseProviderId(provider: string): string {
    if (provider === 'password') return 'password'
    if (provider === 'phone') return 'phone'
    return `${provider}.com`
  }

  private toUiProviderKey(providerId: string): string | null {
    if (!providerId) return null
    if (providerId === 'password' || providerId === 'phone') return providerId
    return providerId.endsWith('.com') ? providerId.replace('.com', '') : providerId
  }

  private getCurrentProviderId(): string {
    return this.user?.currProviderData?.providerId || this.user?.providerId || ''
  }

  isCurrentProvider(provider: string): boolean {
    return this.getCurrentProviderId() === this.toFirebaseProviderId(provider)
  }

  private async refreshSecurityUser(): Promise<void> {
    const newUser = await this.authService.refreshUserData()
    if (newUser) {
      this.user = newUser
      this.hasProviderPassword.set({
        provider: this.getCurrentProviderId(),
        has: this.user?.providerData.some((provider) => provider.providerId === 'password') ?? false,
      })
      this.initProviders()
      this.syncTotpFactors()
      this.syncMfaStatusControl()
      this.loadActiveSessions()
      this.loadActivityTimeline()
    }
  }

  hasAnyMfaFactors(): boolean {
    return this.totpFactors().length > 0 || this.phoneMfaFactors().length > 0
  }

  private syncMfaStatusControl(): void {
    this.mfaStatusControl.setValue(this.hasAnyMfaFactors(), { emitEvent: false })
  }

  private canEnrollPhoneMfa(): boolean {
    return this.canEnrollTotp()
  }

  getExistingPhoneMfaNumber(): string {
    const phoneFactor = this.phoneMfaFactors()[0] as MultiFactorInfo & { phoneNumber?: string }
    return String(phoneFactor?.phoneNumber || '').trim()
  }

  private getPhoneNumberCandidate(): string {
    return this.getExistingPhoneMfaNumber() || String(this.user?.phoneNumber || '').trim()
  }

  private async onMfaStatusSelected(enabled: boolean): Promise<void> {
    if (enabled) {
      if (this.hasAnyMfaFactors()) {
        this.syncMfaStatusControl()
        return
      }

      if (!this.canEnrollPhoneMfa()) {
        this.syncMfaStatusControl()
        this.showSnackbar('Multi-factor authentication is not available for the current sign-in method. Sign in with email/password, Google, or GitHub and try again.', SnackBarType.warning, '', 6000)
        return
      }

      if (this.user?.emailVerified) {
        // Prefer SMS if user already has a verified phone (linked phone provider or phoneVerified flag)
        if (this.isPhoneVerifiedForDisplay()) {
          this.openPhoneAdd()
          return
        }
        await this.startTotpSetup()
        return
      }

      this.openPhoneAdd()
      this.showSnackbar('Add an SMS second factor first, or verify your email to enable authenticator app MFA.', SnackBarType.info, '', 6000)
      return
    }

    if (!this.hasAnyMfaFactors()) {
      this.syncMfaStatusControl()
      return
    }

    this.confirmationDialog.set('disable-mfa')
    this.cdr.detectChanges()
    return

  }

  closeConfirmationDialog(): void {
    const dialogType = this.confirmationDialog()
    this.confirmationDialog.set(null)
    this.pendingSessionToRevoke.set(null)

    if (dialogType === 'disable-mfa') {
      this.syncMfaStatusControl()
    }

    this.cdr.detectChanges()
  }

  async confirmDialogAction(): Promise<void> {
    const dialogType = this.confirmationDialog()
    this.confirmationDialog.set(null)

    if (dialogType === 'disable-mfa') {
      await this.disableMfaFactors()
      return
    }

    if (dialogType === 'revoke-current-session') {
      const session = this.pendingSessionToRevoke()
      this.pendingSessionToRevoke.set(null)
      if (session) {
        this.runSessionRevoke(session)
      }
      return
    }

    this.pendingSessionToRevoke.set(null)
    this.cdr.detectChanges()
  }

  getConfirmationTitle(): string {
    if (this.confirmationDialog() === 'disable-mfa') {
      return 'Disable multi-factor authentication?'
    }

    if (this.confirmationDialog() === 'revoke-current-session') {
      return 'Revoke current session?'
    }

    return 'Confirm action'
  }

  getConfirmationSubtitle(): string {
    if (this.confirmationDialog() === 'disable-mfa') {
      return 'This will remove <strong class="text-white">all enrolled second factors</strong> from your account.'
    }

    if (this.confirmationDialog() === 'revoke-current-session') {
      return 'You are about to revoke your <strong class="text-white">current session</strong>. You will be signed out immediately.'
    }

    return ''
  }

  getConfirmationConfirmLabel(): string {
    if (this.confirmationDialog() === 'disable-mfa') {
      return 'Disable MFA'
    }

    if (this.confirmationDialog() === 'revoke-current-session') {
      return 'Revoke session'
    }

    return 'Confirm'
  }

  private openCurrentSessionRevokeDialog(session: SessionDisplayInfo & { id?: string }): void {
    this.pendingSessionToRevoke.set(session)
    this.confirmationDialog.set('revoke-current-session')
    this.cdr.detectChanges()
  }

  private async disableMfaFactors(): Promise<void> {

    this.loading.mfa = true
    this.totpError.set('')
    this.phoneError.set('')
    this.cdr.detectChanges()

    try {
      const factorsToRemove = [...this.totpFactors(), ...this.phoneMfaFactors()]
      for (const factor of factorsToRemove) {
        await this.authService.unenrollMultiFactor(factor.uid)
      }

      this.pendingTotpSecret = null
      this.totpStep.set('idle')
      this.phoneStep.set('idle')
      this.phoneMfaVerificationId = ''
      await this.refreshSecurityUser()
      this.showSnackbar('Two-factor authentication disabled', SnackBarType.success, '', 3000)
    } catch (error: any) {
      const message = this.getMfaErrorMessage(error)
      this.showSnackbar(message, SnackBarType.error, '', 6000)
      this.syncMfaStatusControl()
    } finally {
      this.loading.mfa = false
      this.cdr.detectChanges()
    }
  }

  // PHASE 2.2: Updated runSessionRevoke to work with SessionDisplayInfo
  private runSessionRevoke(session: SessionDisplayInfo & { id?: string }): void {
    const loginId = this.resolveSessionId(session)
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
          this.loadActivityTimeline()
          this.cdr.detectChanges()
        },
        error: (error) => {
          this.revokingSessionId.set('')
          this.sessionsError.set(getErrorMessage(error, this.translate))
          this.cdr.detectChanges()
        }
      })
  }


  linkLoginProvider(provider: string) {
    if (this.isProviderMutationInProgress()) {
      this.showSnackbar('Another provider operation is in progress. Please wait.', SnackBarType.info, '', 3000)
      return
    }

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

  private isProviderMutationInProgress(): boolean {
    return this.loading.google || this.loading.github || this.loading.remove || this.isMfaLinkLoading()
  }

  private linkWithGoogle() {
    this.loading.google = true;
    const expectedUid = this.user?.uid || ''
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
              if (expectedUid && response.user.uid !== expectedUid) {
                this.showSnackbar('Linking was blocked because Google authenticated a different account. Sign in with the same email as your current account and try again.', SnackBarType.error, '', 7000)
                return
              }
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
              await this.refreshSecurityUser()
              this.showSnackbar('Google provider linked Sucessfully', SnackBarType.success, '', 3000)
              this.cdr.detectChanges()
            }
          },
          error: (error) => {
            // this.extractFirebaseError(error)
            // this.handleAccountExistsError(error, 'google.com')
            if (error?.code === 'auth/multi-factor-auth-required') {
              void this.handleMfaLinkChallenge(error, 'google')
              return
            }
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
    const expectedUid = this.user?.uid || ''

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
              if (expectedUid && response.user.uid !== expectedUid) {
                this.showSnackbar('Linking was blocked because GitHub authenticated a different account. Sign in with the same email as your current account and try again.', SnackBarType.error, '', 7000)
                return
              }
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
              await this.refreshSecurityUser()
              this.showSnackbar('Github provider linked Sucessfully', SnackBarType.success, '', 3000)
              this.cdr.detectChanges()
            }
          },
          error: (error) => {
            // this.extractFirebaseError(error)
            // this.handleAccountExistsError(error, 'github.com')
            if (error?.code === 'auth/multi-factor-auth-required') {
              void this.handleMfaLinkChallenge(error, 'github')
              return
            }
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
    if (this.isProviderMutationInProgress()) {
      this.showSnackbar('Another provider operation is in progress. Please wait.', SnackBarType.info, '', 3000)
      return
    }

    // Check if the provider to be unlinked is the currently logged-in provider
    const providerId = this.toFirebaseProviderId(provider)
    if (this.isCurrentProvider(provider)) {
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
          await this.refreshSecurityUser()
          this.cdr.detectChanges()
        },
        error: (error) => {
          if (provider !== 'password')
            this.loading[provider as 'github' | 'google'] = false
          else
            this.loading.email = !(provider === 'password')

          // Handle errors and show an error message
          const explicitMessage = typeof error?.message === 'string' ? error.message.trim() : ''
          const errorMessage = explicitMessage || getErrorMessage(error, this.translate);
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
    this.loading.password = true
    from(this.authService.updatePassword(newPassword))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (userCredential) => {

          try {
                await this.refreshSecurityUser()
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
      const message = this.getMfaErrorMessage(error)
      this.totpError.set(message)
      this.showSnackbar(message, SnackBarType.warning, '', 6000)
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
      const message = this.getMfaErrorMessage(error)
      this.totpError.set(message)
      this.showSnackbar(message, SnackBarType.warning, '', 6000)
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
      const message = this.getMfaErrorMessage(error)
      this.totpError.set(message)
      this.showSnackbar(message, SnackBarType.warning, '', 6000)
    } finally {
      this.loading.mfa = false
      this.cdr.detectChanges()
    }
  }

  private getMfaErrorMessage(error: any): string {
    const code = String(error?.code || '').toLowerCase()
    const rawMessage = String(error?.message || '').trim()
    const normalizedMessage = rawMessage.toLowerCase()

    if (
      code === 'auth/missing-phone-number' ||
      code === 'auth/invalid-argument' ||
      normalizedMessage.includes('no phone number enrolled') ||
      normalizedMessage.includes('missing phone number') ||
      normalizedMessage.includes('missing phoneenrollmentinfo') ||
      normalizedMessage.includes('phoneenrollmentinfo')
    ) {
      return 'Add SMS / Text message as a real second factor first, then enable authenticator app MFA.'
    }

    if (
      code === 'auth/unsupported-first-factor' ||
      normalizedMessage.includes('unsupported_first_factor') ||
      normalizedMessage.includes('mfa is not available for the given first factor')
    ) {
      return 'Authenticator app MFA is not available for your current sign-in method. Sign in with email/password, Google, or GitHub and try again.'
    }

    if (
      normalizedMessage.includes('operation_not_allowed') &&
      normalizedMessage.includes('totp based mfa not enabled')
    ) {
      return 'Authenticator app MFA is not enabled for this project yet. Ask an administrator to enable TOTP MFA in Admin > Project Configuration, then retry enrollment.'
    }

    if (rawMessage && !code.startsWith('auth/')) {
      return rawMessage
    }

    return getErrorMessage(error, this.translate)
  }

  isPhoneVerifiedForDisplay(): boolean {
    const hasPhoneProvider = this.user?.providerData?.some((provider) => provider.providerId === 'phone') ?? false
    return this.user?.phoneVerified === true || (hasPhoneProvider && !!this.user?.phoneNumber) || this.phoneMfaFactors().length > 0
  }

  canEnrollTotp(): boolean {
    const unsupportedFirstFactors = new Set(['phone', 'anonymous', 'gc.apple.com'])
    const providers = this.user?.providerData || []
    if (!providers.length) {
      return false
    }

    return providers.some((provider) => !unsupportedFirstFactors.has(provider.providerId))
  }

  private syncTotpFactors(): void {
    const factors = this.authService.getEnrolledMultiFactorHints()
    this.totpFactors.set(factors.filter((factor) => factor.factorId === 'totp'))
    this.phoneMfaFactors.set(factors.filter((factor) => factor.factorId === 'phone'))
    this.syncMfaStatusControl()
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
    this.phoneNumber.reset(this.getPhoneNumberCandidate())
    this.otpControl.reset('')
    this.phoneMfaVerificationId = ''
    this.cdr.detectChanges()
  }

  openAccountPhoneEdit(): void {
    this.accountPhoneStep.set('enter-number')
    this.accountPhoneError.set('')
    this.accountPhoneNumber.reset(String(this.user?.phoneNumber || '').trim())
    this.accountPhoneCode.reset('')
    this.accountPhoneConfirmationResult = null
    this.cdr.detectChanges()
  }

  async sendAccountPhoneCode(): Promise<void> {
    if (this.accountPhoneNumber.invalid || this.loading.phone) return

    const existingAccountPhone = String(this.user?.phoneNumber || '').trim()
    const nextPhone = String(this.accountPhoneNumber.value || '').trim()
    if (existingAccountPhone && existingAccountPhone !== nextPhone) {
      this.accountPhoneError.set('Unlink your current account phone first, then add the new one.')
      this.cdr.detectChanges()
      return
    }

    this.loading.phone = true
    this.accountPhoneError.set('')
    this.cdr.detectChanges()

    try {
      this.accountPhoneConfirmationResult = await this.authService.linkPhoneNumber(this.accountPhoneNumber.value, this.recaptchaVerifier)
      this.accountPhoneStep.set('enter-code')
      this.accountPhoneCode.reset('')
      this.showSnackbar('Verification code sent to your account phone', SnackBarType.info, '', 3000)
    } catch (error: any) {
      this.accountPhoneError.set(getErrorMessage(error, this.translate))
      try { this.recaptchaVerifier.clear() } catch { /* ignore */ }
      this.initRecaptcha()
    } finally {
      this.loading.phone = false
      this.cdr.detectChanges()
    }
  }

  async verifyAccountPhoneCode(): Promise<void> {
    if (this.accountPhoneCode.invalid || !this.accountPhoneConfirmationResult || this.loading.code) return
    this.loading.code = true
    this.accountPhoneError.set('')
    this.cdr.detectChanges()

    try {
      const result = await this.authService.completePhoneVerification(
        this.accountPhoneConfirmationResult,
        this.accountPhoneCode.value
      )

      const linkedPhone = String(result.user.phoneNumber || this.accountPhoneNumber.value || '').trim()
      if (result.user?.uid && linkedPhone) {
        await this.firestoreService.updateUserPhoneNumber(result.user.uid, linkedPhone, true)
      }

      await this.refreshSecurityUser()
      this.accountPhoneStep.set('idle')
      this.accountPhoneConfirmationResult = null
      this.accountPhoneCode.reset('')
      this.showSnackbar('Account phone verified successfully', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.accountPhoneError.set(getErrorMessage(error, this.translate))
      this.accountPhoneCode.reset('')
    } finally {
      this.loading.code = false
      this.cdr.detectChanges()
    }
  }

  cancelAccountPhoneEdit(): void {
    this.accountPhoneStep.set('idle')
    this.accountPhoneError.set('')
    this.accountPhoneNumber.reset('')
    this.accountPhoneCode.reset('')
    this.accountPhoneConfirmationResult = null
    this.cdr.detectChanges()
  }

  async unlinkAccountPhone(): Promise<void> {
    if (!this.user?.uid) return
    if (this.isCurrentProvider('phone')) {
      this.showSnackbar('Cannot unlink phone while it is your currently active sign-in provider.', SnackBarType.error, '', 5000)
      return
    }

    this.loading.remove = true
    this.accountPhoneError.set('')
    this.cdr.detectChanges()

    try {
      await this.authService.unlinkProvider('phone')
      await this.firestoreService.updateUserPhoneNumber(this.user.uid, '', false)
      await firstValueFrom(this.authService.updatePhoneVerificationStatus(this.user.uid, false))
      await this.refreshSecurityUser()
      this.showSnackbar('Account phone unlinked successfully', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.accountPhoneError.set(getErrorMessage(error, this.translate))
      this.showSnackbar(this.accountPhoneError(), SnackBarType.error, '', 5000)
    } finally {
      this.loading.remove = false
      this.cdr.detectChanges()
    }
  }

  async sendPhoneCode(): Promise<void> {
    if (this.phoneNumber.invalid || this.loading.phone) return
    this.loading.phone = true
    this.phoneError.set('')
    this.cdr.detectChanges()
    try {
      this.phoneMfaVerificationId = await this.authService.startPhoneMfaEnrollment(
        this.phoneNumber.value, this.recaptchaVerifier
      )
      this.phoneStep.set('enter-code')
      this.otpControl.reset('')
      this.showSnackbar('Verification code sent to your phone', SnackBarType.info, '', 3000)
    } catch (error: any) {
      this.phoneError.set(this.getMfaErrorMessage(error))
      try { this.recaptchaVerifier.clear() } catch { /* ignore */ }
      this.initRecaptcha()
    } finally {
      this.loading.phone = false
      this.cdr.detectChanges()
    }
  }

  async verifyPhoneOtp(code: string): Promise<void> {
    if (!code || code.length < 6 || !this.phoneMfaVerificationId || this.loading.code) return
    this.loading.code = true
    this.phoneError.set('')
    this.cdr.detectChanges()
    try {
      await this.authService.completePhoneMfaEnrollment(this.phoneMfaVerificationId, code)
      await this.refreshSecurityUser()
      this.phoneStep.set('idle')
      this.phoneMfaVerificationId = ''
      this.showSnackbar('SMS second factor enrolled successfully!', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.phoneError.set(this.getMfaErrorMessage(error))
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
    this.phoneMfaVerificationId = ''
    this.cdr.detectChanges()
  }

  async removePhoneNumber(): Promise<void> {
    this.loading.remove = true
    this.cdr.detectChanges()
    try {
      for (const factor of this.phoneMfaFactors()) {
        await this.authService.unenrollMultiFactor(factor.uid)
      }
      await this.refreshSecurityUser()
      this.showSnackbar('SMS second factor removed', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.showSnackbar(this.getMfaErrorMessage(error), SnackBarType.error, '', 5000)
    } finally {
      this.loading.remove = false
      this.cdr.detectChanges()
    }
  }

  async removePhoneMfaFactor(factorUid: string): Promise<void> {
    if (this.loading.remove) return
    this.loading.remove = true
    this.phoneError.set('')
    this.cdr.detectChanges()

    try {
      await this.authService.unenrollMultiFactor(factorUid)
      await this.refreshSecurityUser()
      this.showSnackbar('SMS second factor removed', SnackBarType.success, '', 3000)
    } catch (error: any) {
      this.phoneError.set(this.getMfaErrorMessage(error))
      this.showSnackbar(this.phoneError(), SnackBarType.error, '', 5000)
    } finally {
      this.loading.remove = false
      this.cdr.detectChanges()
    }
  }

  // ── MFA challenge for provider linking ────────────────────────────────────

  private async handleMfaLinkChallenge(error: any, provider: 'google' | 'github'): Promise<void> {
    const resolver = this.authService.getMfaResolverFromError(error)
    if (!resolver) {
      const errorMessage = getErrorMessage(error, this.translate)
      this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
      this.loading[provider] = false
      this.cdr.detectChanges()
      return
    }

    this.mfaLinkResolver.set(resolver)
    this.mfaLinkProvider.set(provider)
    this.mfaLinkError.set('')
    this.mfaLinkPhoneFactorIndex.set(0) // Reset phone factor index
    this.mfaLinkPhoneFactorAttempts.set([]) // Clear attempts
    this.mfaLinkOtp.reset('')
    this.mfaLinkTotpCode.reset('')

    const phoneFactors = resolver.hints.filter(h => h.factorId === 'phone')
    const totpFactor = resolver.hints.find(h => h.factorId === 'totp')

    if (phoneFactors.length > 0) {
      this.loading[provider] = true
      this.cdr.detectChanges()
      await this.tryMfaPhoneLinkWithFallback(resolver, phoneFactors, provider)
    } else if (totpFactor) {
      this.mfaLinkStep.set('totp-code')
      this.loading[provider] = false
    } else {
      const errorMessage = getErrorMessage(error, this.translate)
      this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
      this.loading[provider] = false
    }

    this.cdr.detectChanges()
  }

  private async tryMfaPhoneLinkWithFallback(resolver: MultiFactorResolver, phoneFactors: any[], provider: 'google' | 'github'): Promise<void> {
    const attempts: {factorUid: string, phoneNumber: string, error: string}[] = []

    for (let i = 0; i < phoneFactors.length; i++) {
      const phoneFactor = phoneFactors[i]
      const phoneInfo = phoneFactor as MultiFactorInfo & { phoneNumber?: string }
      const phoneNumber = phoneInfo.phoneNumber || phoneFactor.displayName || 'your phone'
      const priority = i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary'

      try {
        this.mfaLinkPhoneFactorIndex.set(i)
        this.mfaLinkPhoneHint.set(`${phoneNumber} (${priority})`)
        this.cdr.detectChanges()

        const verificationId = await this.authService.startPhoneMfaChallenge(
          resolver, phoneFactor.uid, this.recaptchaVerifier
        )
        this.mfaLinkVerificationId.set(verificationId)
        this.mfaLinkStep.set('phone-code')
        this.loading[provider] = false
        this.cdr.detectChanges()
        return // Success, exit the loop
      } catch (err: any) {
        const errorMsg = this.getMfaErrorMessage(err)
        attempts.push({
          factorUid: phoneFactor.uid,
          phoneNumber: phoneNumber,
          error: errorMsg
        })

        // If this isn't the last attempt, try the next phone
        if (i < phoneFactors.length - 1) {
          try { this.recaptchaVerifier.clear() } catch { /* ignore */ }
          this.initRecaptcha()
          continue // Try next phone
        }
      }
    }

    // All phone factors failed
    this.mfaLinkPhoneFactorAttempts.set(attempts)
    const attemptsDisplay = attempts.map((a, idx) => `${idx + 1}. ${a.phoneNumber}: ${a.error}`).join('\n')
    this.mfaLinkError.set(`Failed to send verification code to all enrolled phones:\n${attemptsDisplay}`)
    this.mfaLinkStep.set('idle')
    this.mfaLinkResolver.set(null)
    try { this.recaptchaVerifier.clear() } catch { /* ignore */ }
    this.initRecaptcha()
    this.loading[provider] = false
    this.cdr.detectChanges()
  }

  async completeMfaLinkPhoneChallenge(): Promise<void> {
    const code = this.mfaLinkOtp.value
    const resolver = this.mfaLinkResolver()
    const verificationId = this.mfaLinkVerificationId()
    const provider = this.mfaLinkProvider()
    if (!code || code.length < 6 || !verificationId || !resolver || !provider) return

    this.loading[provider] = true
    this.mfaLinkError.set('')
    this.cdr.detectChanges()

    try {
      const userCredential = await this.authService.completeMfaPhoneChallenge(resolver, verificationId, code)
      await this.finishMfaLinkCompletion(userCredential, provider)
    } catch (err: any) {
      this.mfaLinkError.set(this.getMfaErrorMessage(err))
      this.mfaLinkOtp.reset('')
    } finally {
      this.loading[provider] = false
      this.cdr.detectChanges()
    }
  }

  async completeMfaLinkTotpChallenge(): Promise<void> {
    const code = this.mfaLinkTotpCode.value
    const resolver = this.mfaLinkResolver()
    const provider = this.mfaLinkProvider()
    if (!code || this.mfaLinkTotpCode.invalid || !resolver || !provider) return

    this.loading[provider] = true
    this.mfaLinkError.set('')
    this.cdr.detectChanges()

    try {
      const totpHint = resolver.hints.find(h => h.factorId === 'totp')
      if (!totpHint) throw new Error('No TOTP factor enrolled')
      const userCredential = await this.authService.completeMfaTotpChallenge(resolver, totpHint.uid, code)
      await this.finishMfaLinkCompletion(userCredential, provider)
    } catch (err: any) {
      this.mfaLinkError.set(this.getMfaErrorMessage(err))
      this.mfaLinkTotpCode.reset('')
    } finally {
      this.loading[provider] = false
      this.cdr.detectChanges()
    }
  }

  private async finishMfaLinkCompletion(userCredential: UserCredential, provider: 'google' | 'github'): Promise<void> {
    if (userCredential?.user) {
      const expectedUid = this.user?.uid || ''
      if (expectedUid && userCredential.user.uid !== expectedUid) {
        throw new Error('Linking was blocked because MFA challenge resolved to a different user account. Please sign in with the original account and retry.')
      }
      if (userCredential.user.displayName || userCredential.user.photoURL) {
        await updateProfile(userCredential.user, {
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL || DEFAULT_PROFILE_URL,
        })
      }
      await this.firestoreService.storeUserData(
        userCredential.user,
        this.user?.providerId || `${provider}.com`,
        true,
        this.user?.username
      )
    }
    await this.refreshSecurityUser()
    const label = provider.charAt(0).toUpperCase() + provider.slice(1)
    this.cancelMfaLinkChallenge()
    this.showSnackbar(`${label} provider linked successfully`, SnackBarType.success, '', 3000)
  }

  cancelMfaLinkChallenge(): void {
    const provider = this.mfaLinkProvider()
    if (provider) this.loading[provider] = false
    this.mfaLinkResolver.set(null)
    this.mfaLinkProvider.set('')
    this.mfaLinkStep.set('idle')
    this.mfaLinkVerificationId.set('')
    this.mfaLinkPhoneHint.set('')
    this.mfaLinkPhoneFactorIndex.set(0)
    this.mfaLinkPhoneFactorAttempts.set([])
    this.mfaLinkOtp.reset('')
    this.mfaLinkTotpCode.reset('')
    this.mfaLinkError.set('')
    this.cdr.detectChanges()
  }

  isMfaLinkLoading(): boolean {
    const provider = this.mfaLinkProvider()
    return provider ? this.loading[provider] : false
  }

  ngOnDestroy(): void {
    if (this.recaptchaVerifier) {
      try { this.recaptchaVerifier.clear() } catch { /* ignore */ }
    }
  }

}
