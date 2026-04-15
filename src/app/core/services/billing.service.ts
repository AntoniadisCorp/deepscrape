import { inject, Injectable } from '@angular/core'
import { BehaviorSubject, catchError, combineLatest, from, map, Observable, of, shareReplay, switchMap } from 'rxjs'
import {
  BillingAccessMode,
  BillingCatalogPayload,
  BillingInterval,
  BillingLoadingState,
  BillingPlanTier,
  EnterprisePlanRequestPayload,
  BillingUsageRequest,
  BillingUsageResponse,
  CreditPackCatalog,
  UserBilling,
} from '../types'
import { AuthService } from './auth.service'
import { FirestoreService } from './firestore.service'

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly authService = inject(AuthService)
  private readonly firestoreService = inject(FirestoreService)
  private readonly loadingStateSubject = new BehaviorSubject<BillingLoadingState>({
    checkout: false,
    portal: false,
    trial: false,
    resumeCancellation: false,
    usageReport: false,
  })

  readonly loadingState$ = this.loadingStateSubject.asObservable()

  private setLoading<K extends keyof BillingLoadingState>(key: K, value: boolean): void {
    this.loadingStateSubject.next({
      ...this.loadingStateSubject.value,
      [key]: value,
    })
  }

  private createCheckoutRequestId(prefix: string): string {
    const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    return `${prefix}-${Date.now()}-${randomPart}`
  }

  private getPurchasedCredits(billing: Partial<UserBilling> | UserBilling | undefined): number {
    if (!billing?.credits) {
      return 0
    }

    if (billing.credits.purchasedBalance !== undefined) {
      return Number(billing.credits.purchasedBalance || 0) - Number(billing.credits.purchasedReserved || 0)
    }

    return billing.plan === 'free' ? Number(billing.credits.balance || 0) - Number(billing.credits.reserved || 0) : 0
  }

  private getIncludedCredits(billing: Partial<UserBilling> | UserBilling | undefined): number {
    if (!billing?.credits) {
      return 0
    }

    if (billing.credits.includedBalance !== undefined) {
      return Number(billing.credits.includedBalance || 0) - Number(billing.credits.includedReserved || 0)
    }

    return billing.plan && billing.plan !== 'free' ? Number(billing.credits.balance || 0) - Number(billing.credits.reserved || 0) : 0
  }

  readonly billing$: Observable<UserBilling> = this.firestoreService.authState().pipe(
    switchMap((firebaseUser) => {
      if (!firebaseUser) {
        return of(this.defaultBilling())
      }

      const billingRef = this.firestoreService.doc(`users/${firebaseUser.uid}/billing/current`)
      return from(this.firestoreService.callFunction<void, { billing?: Partial<UserBilling> }>('getMyEntitlements')).pipe(
        catchError(() => of({ billing: undefined })),
        switchMap((entitlements) => this.firestoreService.docData<Partial<UserBilling>>(billingRef).pipe(
          map((data) => this.mergeWithDefault(data as Partial<UserBilling> | undefined)),
          catchError(() => {
            const entitlementBilling = entitlements?.billing as Partial<UserBilling> | undefined
            return of(this.mergeWithDefault(entitlementBilling))
          })
        )),
        catchError(() => of(this.defaultBilling()))
      )
    }),
    catchError(() => of(this.defaultBilling())),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  readonly catalog$: Observable<BillingCatalogPayload> = this.fetchCatalog().pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  )

  readonly isPlatformAdmin$: Observable<boolean> = this.authService.user$.pipe(
    map(() => this.authService.isAdmin),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  hasFeature$(featureKey: string): Observable<boolean> {
    return combineLatest([this.billing$, this.isPlatformAdmin$]).pipe(
      map(([billing, isPlatformAdmin]) => isPlatformAdmin || Boolean(billing.features?.[featureKey]))
    )
  }

  getAccessMode$(): Observable<BillingAccessMode> {
    return this.billing$.pipe(map((billing) => {
      const paidPlans: BillingPlanTier[] = ['trial', 'starter', 'pro', 'enterprise']
      const hasPaidPlan = paidPlans.includes(billing.plan)
      const hasCreditAccess = billing.plan === 'free' && this.getPurchasedCredits(billing) > 0
      const hasGrace = !!billing.graceUntil && Date.now() < new Date(billing.graceUntil).getTime()

      if (hasPaidPlan) {
        return 'plan'
      }

      if (hasCreditAccess) {
        return 'credits'
      }

      if (hasGrace) {
        return 'grace'
      }

      return 'free'
    }))
  }

  hasCreditAccess$(): Observable<boolean> {
    return this.getAccessMode$().pipe(map((mode) => mode === 'credits'))
  }

  canPurchaseCredits$(): Observable<boolean> {
    return this.billing$.pipe(map((billing) => billing.plan === 'free' && !billing.subscriptionId))
  }

  getPurchasedCredits$(): Observable<number> {
    return this.billing$.pipe(map((billing) => this.getPurchasedCredits(billing)))
  }

  getIncludedCredits$(): Observable<number> {
    return this.billing$.pipe(map((billing) => this.getIncludedCredits(billing)))
  }

  canAccessPaidFeatures$(): Observable<boolean> {
    return combineLatest([this.getAccessMode$(), this.isPlatformAdmin$]).pipe(
      map(([mode, isPlatformAdmin]) => isPlatformAdmin || mode !== 'free')
    )
  }

  async openCheckoutForPlan(args: {
    planId: BillingPlanTier
    interval: BillingInterval
    successUrl: string
    cancelUrl: string
  }): Promise<{ url: string; sessionId: string }> {
    this.setLoading('checkout', true)
    try {
      return this.firestoreService.callFunction<{
        planId: BillingPlanTier
        interval: BillingInterval
        successUrl: string
        cancelUrl: string
        checkoutRequestId: string
      }, { url: string; sessionId: string }>('createCheckoutSession', {
        ...args,
        checkoutRequestId: this.createCheckoutRequestId('plan'),
      })
    } finally {
      this.setLoading('checkout', false)
    }
  }

  async openCheckoutForCreditPack(args: {
    planId: string
    successUrl: string
    cancelUrl: string
    quantity?: number
  }): Promise<{ url: string; sessionId: string }> {
    this.setLoading('checkout', true)
    try {
      return this.firestoreService.callFunction<{
        planId: string
        successUrl: string
        cancelUrl: string
        quantity?: number
        checkoutRequestId: string
      }, { url: string; sessionId: string }>('createCheckoutSession', {
        ...args,
        checkoutRequestId: this.createCheckoutRequestId('credit-pack'),
      })
    } finally {
      this.setLoading('checkout', false)
    }
  }

  async openCheckoutForCustomCredits(args: {
    credits: number
    successUrl: string
    cancelUrl: string
  }): Promise<{ url: string; sessionId: string }> {
    this.setLoading('checkout', true)
    try {
      return this.firestoreService.callFunction<{
        planId: string
        customCredits: number
        successUrl: string
        cancelUrl: string
        checkoutRequestId: string
      }, { url: string; sessionId: string }>('createCheckoutSession', {
        planId: 'custom_credits',
        customCredits: args.credits,
        successUrl: args.successUrl,
        cancelUrl: args.cancelUrl,
        checkoutRequestId: this.createCheckoutRequestId('custom-credits'),
      })
    } finally {
      this.setLoading('checkout', false)
    }
  }

  async openBillingPortal(returnUrl: string): Promise<string> {
    this.setLoading('portal', true)
    try {
      const response = await this.firestoreService.callFunction<{ returnUrl: string }, { url: string }>(
        'createBillingPortalSession',
        { returnUrl }
      )
      return response.url
    } finally {
      this.setLoading('portal', false)
    }
  }

  async startTrial(): Promise<{
    billing?: Partial<UserBilling>
    userId?: string
    trialStartedAt?: string
    trialEndsAt?: string
  }> {
    this.setLoading('trial', true)
    try {
      return this.firestoreService.callFunction<void, {
        billing?: Partial<UserBilling>
        userId?: string
        trialStartedAt?: string
        trialEndsAt?: string
      }>('startTrial')
    } finally {
      this.setLoading('trial', false)
    }
  }

  async resumeSubscriptionCancellation(): Promise<{
    billing?: Partial<UserBilling>
    subscriptionId?: string
    cancelAtPeriodEnd?: boolean
  }> {
    this.setLoading('resumeCancellation', true)
    try {
      return this.firestoreService.callFunction<void, {
        billing?: Partial<UserBilling>
        subscriptionId?: string
        cancelAtPeriodEnd?: boolean
      }>('resumeSubscriptionCancellation')
    } finally {
      this.setLoading('resumeCancellation', false)
    }
  }

  async verifyCheckoutSession(sessionId: string): Promise<{
    valid: boolean
    mode: string | null
    paymentStatus: string | null
    status: string | null
    sessionId: string
  }> {
    return this.firestoreService.callFunction<{ sessionId: string }, {
      valid: boolean
      mode: string | null
      paymentStatus: string | null
      status: string | null
      sessionId: string
    }>('verifyCheckoutSession', { sessionId })
  }

  async submitEnterprisePlanRequest(payload: EnterprisePlanRequestPayload): Promise<{ success: boolean }> {
    return this.firestoreService.callFunction<EnterprisePlanRequestPayload, { success: boolean }>(
      'submitEnterprisePlanRequest',
      payload
    )
  }

  async getUsageReport(args: BillingUsageRequest): Promise<BillingUsageResponse> {
    this.setLoading('usageReport', true)
    try {
      return this.firestoreService.callFunction<BillingUsageRequest, BillingUsageResponse>('getBillingUsage', args)
    } finally {
      this.setLoading('usageReport', false)
    }
  }

  async getAdminBillingObservability(args?: {
    incidentLimit?: number
    failedEventLimit?: number
    pendingEventLimit?: number
    pastDueLimit?: number
    includeAcknowledged?: boolean
  }): Promise<{
    generatedAt: string
    incidents: Array<Record<string, unknown>>
    failedEvents: Array<Record<string, unknown>>
    pendingEvents: Array<Record<string, unknown>>
    pastDueAccounts: Array<Record<string, unknown>>
  }> {
    return this.firestoreService.callFunction<typeof args, {
      generatedAt: string
      incidents: Array<Record<string, unknown>>
      failedEvents: Array<Record<string, unknown>>
      pendingEvents: Array<Record<string, unknown>>
      pastDueAccounts: Array<Record<string, unknown>>
    }>('getAdminBillingObservability', args)
  }

  async acknowledgeBillingIncident(incidentId: string): Promise<{ ok: boolean; incidentId: string }> {
    return this.firestoreService.callFunction<{ incidentId: string }, { ok: boolean; incidentId: string }>(
      'acknowledgeBillingIncident',
      { incidentId }
    )
  }

  async requestStripeEventRetry(eventId: string): Promise<{ ok: boolean; eventId: string }> {
    return this.firestoreService.callFunction<{ eventId: string }, { ok: boolean; eventId: string }>(
      'requestStripeEventRetry',
      { eventId }
    )
  }

  getPlans$(includeFree = true): Observable<BillingCatalogPayload['plans']> {
    return this.catalog$.pipe(
      map((catalog) => includeFree ? catalog.plans : catalog.plans.filter((plan) => plan.id !== 'free'))
    )
  }

  getCreditPacks$(): Observable<CreditPackCatalog[]> {
    return this.catalog$.pipe(map((catalog) => catalog.creditPacks))
  }

  getCustomCreditsConfig$(): Observable<BillingCatalogPayload['customCredits']> {
    return this.catalog$.pipe(map((catalog) => catalog.customCredits))
  }

  private fetchCatalog(): Observable<BillingCatalogPayload> {
    return from(this.firestoreService.callFunction<void, BillingCatalogPayload>('getBillingCatalog'))
  }

  private mergeWithDefault(data: Partial<UserBilling> | undefined): UserBilling {
    const fallback = this.defaultBilling()
    if (!data) {
      return fallback
    }

    const mergedCredits = {
      ...fallback.credits,
      ...(data.credits || {}),
    }

    if (mergedCredits.purchasedBalance === undefined && data.plan === 'free') {
      mergedCredits.purchasedBalance = Number(mergedCredits.balance || 0)
      mergedCredits.purchasedReserved = Number(mergedCredits.reserved || 0)
    }

    if (mergedCredits.includedBalance === undefined && data.plan && data.plan !== 'free') {
      mergedCredits.includedBalance = Number(mergedCredits.balance || 0)
      mergedCredits.includedReserved = Number(mergedCredits.reserved || 0)
    }

    return {
      ...fallback,
      ...data,
      credits: mergedCredits,
      features: {
        ...fallback.features,
        ...(data.features || {}),
      },
    }
  }

  private defaultBilling(): UserBilling {
    return {
      plan: 'free',
      status: 'inactive',
      subscriptionId: null,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      graceUntil: null,
      credits: {
        balance: 0,
        reserved: 0,
        purchasedBalance: 0,
        purchasedReserved: 0,
        includedBalance: 0,
        includedReserved: 0,
      },
      features: {},
    }
  }
}
