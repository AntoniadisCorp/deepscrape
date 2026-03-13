import { AsyncPipe, CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { RippleDirective } from 'src/app/core/directives';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  BillingLoadingState,
  BillingInterval,
  BillingPlanCatalog,
  BillingPlanTier,
  CustomCreditsCatalog,
  CreditPackCatalog,
  PlanPeriod,
  UserBilling,
} from 'src/app/core/types';
import { AuthService, BillingService } from 'src/app/core/services';
import { firstValueFrom, map, Observable } from 'rxjs';
import { WindowToken } from 'src/app/core/services';

@Component({
    selector: 'app-plans',
  imports: [NgIf, NgFor, RippleDirective, CurrencyPipe, AsyncPipe, NgClass, MatIconModule, MatProgressSpinnerModule, FormsModule],
    templateUrl: './plans.component.html',
    styleUrl: './plans.component.scss',
    animations: [
      trigger('offerBadgeAnimation', [
        transition(':enter', [
          style({ opacity: 0, transform: 'translateY(-8px) scale(0.96)' }),
          animate('260ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
        ]),
        transition(':leave', [
          animate('220ms ease-in', style({ opacity: 0, transform: 'translateY(-6px) scale(0.98)' })),
        ]),
      ]),
    ]
})


export class PlansComponent {
  private window: Window = inject(WindowToken)
  planView: PlanPeriod
  planPeriods: Array<PlanPeriod> = []

  currencyValue: string = "EUR"

  readonly plans$: Observable<BillingPlanCatalog[]>
  readonly freePlan$: Observable<BillingPlanCatalog | null>
  readonly trialPlan$: Observable<BillingPlanCatalog | null>
  readonly creditPacks$: Observable<CreditPackCatalog[]>
  readonly customCreditsConfig$: Observable<CustomCreditsCatalog>
  readonly billing$: Observable<UserBilling>
  readonly currentPlan$: Observable<BillingPlanTier>
  currentPlanValue: BillingPlanTier | null = null
  currentBillingValue: UserBilling | null = null
  offerBadgeMessage: string | null = null
  isBillingRestricted = false
  customCreditsAmount = 250
  readonly loadingState$ = this.billingService.loadingState$

  currentPrice: PlanPeriod = { value: "monthly", label: "Monthly" }

  private readonly periodByInterval: Record<BillingInterval, PlanPeriod> = {
    payAsYouGo: { value: "payAsYouGo", label: "Pay as you go" },
    monthly: { value: "monthly", label: "Monthly" },
    quarterly: { value: "quarterly", label: "Quarterly" },
    annually: { value: "annually", label: "Annually" },
  }

  private readonly restrictedRoleKeywords = ['admin', 'manager', 'editor']

  constructor(
    private readonly billingService: BillingService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    const catalogPlans$ = this.billingService.getPlans$()
    this.freePlan$ = catalogPlans$.pipe(map((plans) => plans.find((plan) => plan.id === 'free') || null))
    this.trialPlan$ = catalogPlans$.pipe(map((plans) => plans.find((plan) => plan.id === 'trial') || null))
    this.plans$ = catalogPlans$.pipe(map((plans) => plans.filter((plan) => plan.id !== 'trial' && plan.id !== 'free')))
    this.billing$ = this.billingService.billing$
    this.currentPlan$ = this.billing$.pipe(map((billing) => billing.plan))
    this.billing$.subscribe((billing) => {
      this.currentBillingValue = billing
      this.currentPlanValue = billing.plan

      const planInterval = billing.planInterval
      if (planInterval && this.periodByInterval[planInterval]) {
        this.currentPrice = this.periodByInterval[planInterval]
      }
    })

    this.route.queryParamMap.subscribe((params) => {
      const shouldShowOffer = params.get('offer') === '1'
      if (!shouldShowOffer) {
        this.offerBadgeMessage = null
        return
      }

      this.offerBadgeMessage = params.get('offerMessage') || 'oh are you not satisfied with the offer, ask for new offer'
      this.window.setTimeout(() => {
        this.offerBadgeMessage = null
      }, 6500)
    })

    this.creditPacks$ = this.billingService.getCreditPacks$()
    this.customCreditsConfig$ = this.billingService.getCustomCreditsConfig$()

    this.authService.user$.subscribe((user) => {
      this.isBillingRestricted = this.isRestrictedRole(user?.role)
    })

    this.planPeriods = [
      { value: "payAsYouGo", label: "Pay as you go" },
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
      { value: "annually", label: "Annually" }]


    if (!this.currentPrice.value || !this.currentPlan$)
      this.planView = { value: "payAsYouGo", label: "Pay as you go" }
    else this.planView = this.currentPrice
  }

  switchPlanView(plan: PlanPeriod) {
    this.planView = plan
  }

  isBusy(loading: BillingLoadingState | null | undefined): boolean {
    if (!loading) {
      return false
    }

    return loading.checkout || loading.portal || loading.trial || loading.resumeCancellation
  }

  getPrice(plan: BillingPlanCatalog): number {
    const interval = this.planView.value as BillingInterval
    return plan.prices[interval]?.amount || 0
  }

  getIncludedCredits(plan: BillingPlanCatalog): number {
    const interval = this.planView.value as BillingInterval
    return plan.prices[interval]?.includedCredits || 0
  }

  canPurchaseCredits(billing: UserBilling | null | undefined): boolean {
    if (this.isBillingRestricted) {
      return false
    }

    if (!billing) {
      return false
    }

    return billing.plan === 'free' && !billing.subscriptionId
  }

  getAvailableCredits(billing: UserBilling | null | undefined): number {
    if (!billing) {
      return 0
    }

    if (billing.credits.purchasedBalance !== undefined) {
      return Math.max(0, (billing.credits.purchasedBalance || 0) - (billing.credits.purchasedReserved || 0))
    }

    return billing.plan === 'free' ? Math.max(0, (billing.credits.balance || 0) - (billing.credits.reserved || 0)) : 0
  }

  getIncludedPlanCredits(billing: UserBilling | null | undefined): number {
    if (!billing) {
      return 0
    }

    if (billing.credits.includedBalance !== undefined) {
      return Math.max(0, (billing.credits.includedBalance || 0) - (billing.credits.includedReserved || 0))
    }

    return billing.plan !== 'free' ? Math.max(0, (billing.credits.balance || 0) - (billing.credits.reserved || 0)) : 0
  }

  hasCreditAccess(billing: UserBilling | null | undefined): boolean {
    if (!billing) {
      return false
    }

    return billing.plan === 'free' && this.getAvailableCredits(billing) > 0
  }

  getCreditsUnavailableMessage(billing: UserBilling | null | undefined): string {
    if (!billing) {
      return 'Credits are only available when your account is on the free plan.'
    }

    if (billing.plan !== 'free') {
      return 'Standalone credits are disabled while a trial or paid subscription is active. Use either subscription access or credit access, not both.'
    }

    if (billing.subscriptionId) {
      return 'Credits cannot be purchased while a subscription is attached to this account.'
    }

    return 'Credits are available only when your account is on the free plan.'
  }

  clampCustomCredits(config: CustomCreditsCatalog): void {
    const value = Math.floor(Number(this.customCreditsAmount || 0))
    if (!Number.isFinite(value)) {
      this.customCreditsAmount = config.minimumCredits
      return
    }

    this.customCreditsAmount = Math.min(config.maximumCredits, Math.max(config.minimumCredits, value))
  }

  getCustomCreditsTotal(config: CustomCreditsCatalog): number {
    const credits = Math.floor(Number(this.customCreditsAmount || 0))
    if (!Number.isFinite(credits) || credits <= 0) {
      return 0
    }

    return credits * config.unitAmount
  }

  setSuggestedCustomCredits(credits: number, config: CustomCreditsCatalog): void {
    this.customCreditsAmount = credits
    this.clampCustomCredits(config)
  }

  getPriceUnit(): string {
    switch (this.planView.value) {
    case 'monthly':
      return '/month'
    case 'quarterly':
      return '/quarter'
    case 'annually':
      return '/year'
    default:
      return '/usage'
    }
  }

  canCheckoutPlan(plan: BillingPlanCatalog): boolean {
    if (this.isBillingRestricted) {
      return false
    }

    if (plan.id === 'free' || plan.id === 'trial') {
      return false
    }

    const interval = this.planView.value as BillingInterval
    return Boolean(plan.prices[interval]?.stripePriceId)
  }

  isBestChoice(plan: BillingPlanCatalog): boolean {
    return plan.id === 'pro'
  }

  getPriceGradientClass(plan: BillingPlanCatalog): string {
    if (plan.id === 'starter') {
      return 'from-orange-400 to-deep-orange-400 dark:from-orange-400 dark:to-deep-orange-400'
    }

    if (plan.id === 'enterprise') {
      return 'from-primary to-violet-500 dark:from-primary dark:to-violet-500'
    }

    return 'from-violet-400 to-deep-purple-400 dark:from-violet-400 dark:to-deep-purple-400'
  }

  getPlanButtonClass(plan: BillingPlanCatalog): string {
    if (plan.id === 'starter') {
      return 'hover:bg-orange-900/[0.5] focus:bg-orange-900/[0.8] bg-orange-600/[.8]'
    }

    if (plan.id === 'enterprise') {
      return 'hover:bg-primary/70 focus:bg-primary/80 bg-primary/80'
    }

    return 'hover:bg-violet-900/[0.5] focus:bg-violet-900/[0.8] bg-violet-600/[.8]'
  }

  getCurrentPlanButtonClass(plan: BillingPlanCatalog): string {
    return 'bg-transparent dark:bg-transparent text-green-600 dark:text-green-300 border border-green-500/40 dark:border-green-400/40 cursor-not-allowed'
  }

  isCurrentPlan(plan: BillingPlanCatalog, currentPlan: BillingPlanTier | null, billing?: UserBilling | null): boolean {
    if (currentPlan !== plan.id) {
      return false
    }

    if (!billing) {
      return true
    }

    if (plan.id === 'free' || plan.id === 'trial') {
      return true
    }

    const activeInterval = billing.planInterval
    if (!activeInterval) {
      return true
    }

    return activeInterval === this.planView.value
  }

  isRestrictedRole(role: string | null | undefined): boolean {
    const normalizedRole = (role || '').trim().toLowerCase()
    if (!normalizedRole) {
      return false
    }

    return this.restrictedRoleKeywords.some((keyword) => normalizedRole === keyword || normalizedRole.includes(keyword))
  }

  canStartTrial(billing: UserBilling | null | undefined): boolean {
    if (this.isBillingRestricted) {
      return false
    }

    if (!billing) {
      return true
    }

    if (billing.plan !== 'free' && billing.plan !== 'trial') {
      return false
    }

    if (billing.plan === 'trial') {
      return false
    }

    return !billing.trialUsedAt
  }

  shouldShowTrialPromo(trialPlan: BillingPlanCatalog | null | undefined, billing: UserBilling | null | undefined): boolean {
    return Boolean(trialPlan) && this.canStartTrial(billing)
  }

  shouldShowTrialStatus(trialPlan: BillingPlanCatalog | null | undefined, billing: UserBilling | null | undefined): boolean {
    if (!trialPlan || !billing) {
      return false
    }

    return Boolean(billing.trialUsedAt)
  }

  getTrialStatusMessage(billing: UserBilling | null | undefined): string {
    if (!billing?.trialUsedAt) {
      return 'Your 14-day trial is available.'
    }

    if (billing.plan === 'trial') {
      const endsAt = billing.trialEndsAt ? new Date(billing.trialEndsAt).toLocaleDateString() : null
      return endsAt
        ? `Your 14-day trial is active until ${endsAt}.`
        : 'Your 14-day trial is currently active.'
    }

    return 'You have already used your one-time 14-day trial.'
  }

  isPlanActionDisabled(plan: BillingPlanCatalog, currentPlan: BillingPlanTier | null, billing: UserBilling | null | undefined): boolean {
    if (this.isBillingRestricted) {
      return true
    }

    if (this.isCurrentPlan(plan, currentPlan, billing)) {
      return true
    }

    if (plan.id === 'trial') {
      return !this.canStartTrial(billing)
    }

    return false
  }

  getPlanActionLabel(plan: BillingPlanCatalog, currentPlan: BillingPlanTier | null, billing: UserBilling | null | undefined): string {
    if (this.isCurrentPlan(plan, currentPlan, billing)) {
      return 'Current Plan'
    }

    if (plan.id === 'trial') {
      return this.canStartTrial(billing) ? 'Start Trial' : 'Trial Already Used'
    }

    return `Select ${plan.label} Plan`
  }

  getPlanTabClass(plan: BillingPlanCatalog, currentPlan: BillingPlanTier | null, billing: UserBilling | null | undefined): string {
    if (this.isCurrentPlan(plan, currentPlan, billing)) {
      if (plan.id === 'free') {
        return 'relative px-6 py-2 rounded-full transition-all duration-300 ease-in-out text-white bg-violet-500 dark:bg-violet-500'
      }

      return 'relative px-6 py-2 rounded-full transition-all duration-300 ease-in-out text-gray-800 dark:text-gray-100 bg-transparent dark:bg-transparent border border-gray-400/40 dark:border-gray-500/40'
    }

    return `relative px-6 py-2 rounded-full transition-all duration-300 ease-in-out text-white ${this.getPlanButtonClass(plan)}`
  }

  shouldShowFreeRecommendedBadge(plan: BillingPlanCatalog, currentPlan: BillingPlanTier | null, billing: UserBilling | null | undefined): boolean {
    return plan.id === 'free' && this.isCurrentPlan(plan, currentPlan, billing)
  }

  isCancellationPendingForPlan(plan: BillingPlanCatalog, billing: UserBilling | null | undefined, currentPlan: BillingPlanTier | null): boolean {
    if (plan.id === 'free') {
      return false
    }

    if (!billing?.subscriptionId) {
      return false
    }

    if (!this.isCurrentPlan(plan, currentPlan, billing)) {
      return false
    }

    return Boolean(billing.cancelAtPeriodEnd && billing.currentPeriodEnd)
  }

  getCancellationEndLabel(billing: UserBilling | null | undefined): string {
    if (!billing?.currentPeriodEnd) {
      return 'the end of your current billing period'
    }

    const endingAt = new Date(billing.currentPeriodEnd)
    if (Number.isNaN(endingAt.getTime())) {
      return 'the end of your current billing period'
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(endingAt)
  }

  getCancellationTimeRemainingText(billing: UserBilling | null | undefined): string {
    if (!billing?.currentPeriodEnd) {
      return 'an unknown amount of time'
    }

    const endingAt = new Date(billing.currentPeriodEnd).getTime()
    if (Number.isNaN(endingAt)) {
      return 'an unknown amount of time'
    }

    const msRemaining = endingAt - Date.now()
    if (msRemaining <= 0) {
      return 'less than a minute'
    }

    const totalMinutes = Math.floor(msRemaining / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60

    const parts: string[] = []
    if (days > 0) {
      parts.push(`${days} day${days === 1 ? '' : 's'}`)
    }

    if (hours > 0) {
      parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
    }

    if (days === 0 && minutes > 0) {
      parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
    }

    return parts.slice(0, 2).join(', ') || 'less than a minute'
  }

  openPlanDetails(planId: BillingPlanTier): void {
    void this.router.navigate(['/billing/plans', planId])
  }

  openTrialDetails(): void {
    this.openPlanDetails('trial')
  }

  openUsage(): void {
    void this.router.navigate(['/billing/usage'])
  }

  async selectPlan(plan: BillingPlanCatalog): Promise<void> {
    if (this.isBillingRestricted) {
      return
    }

    if (this.isCurrentPlan(plan, this.currentPlanValue, this.currentBillingValue)) {
      this.openPlanDetails(plan.id)
      return
    }

    if (plan.id === 'trial') {
      const billing = await firstValueFrom(this.billing$)
      if (!this.canStartTrial(billing)) {
        return
      }

      try {
        await this.billingService.startTrial()
      } catch (error) {
        console.error('Unable to start trial', error)
      }
      return
    }

    if (!this.canCheckoutPlan(plan)) {
      this.openPlanDetails(plan.id)
      return
    }

    try {
      const successUrl = `${this.window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${this.window.location.origin}/billing/plans?offer=1&offerMessage=${encodeURIComponent('oh are you not satisfied with the offer, ask for new offer')}`

      const result = await this.billingService.openCheckoutForPlan({
        planId: plan.id,
        interval: this.planView.value as BillingInterval,
        successUrl,
        cancelUrl,
      })

      if (result.url) {
        this.window.location.assign(result.url)
      }
    } catch (error) {
      console.error('Unable to create checkout session', error)
    }
  }

  async buyCredits(pack: CreditPackCatalog): Promise<void> {
    if (!this.canPurchaseCredits(this.currentBillingValue)) {
      return
    }

    try {
      const successUrl = `${this.window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${this.window.location.origin}/billing/plans?offer=1&offerMessage=${encodeURIComponent('oh are you not satisfied with the offer, ask for new offer')}`

      const result = await this.billingService.openCheckoutForCreditPack({
        planId: pack.id,
        successUrl,
        cancelUrl,
      })

      if (result.url) {
        this.window.location.assign(result.url)
      }
    } catch (error) {
      console.error('Unable to create credit pack checkout session', error)
    }
  }

  async buyCustomCredits(config: CustomCreditsCatalog): Promise<void> {
    if (!this.canPurchaseCredits(this.currentBillingValue)) {
      return
    }

    this.clampCustomCredits(config)

    try {
      const successUrl = `${this.window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${this.window.location.origin}/billing/plans?offer=1&offerMessage=${encodeURIComponent('custom credits checkout canceled')}`

      const result = await this.billingService.openCheckoutForCustomCredits({
        credits: this.customCreditsAmount,
        successUrl,
        cancelUrl,
      })

      if (result.url) {
        this.window.location.assign(result.url)
      }
    } catch (error) {
      console.error('Unable to create custom credits checkout session', error)
    }
  }

  async openPortal(): Promise<void> {
    if (this.isBillingRestricted) {
      return
    }

    try {
      const url = await this.billingService.openBillingPortal(this.window.location.origin + '/billing/plans')
      if (url) {
        this.window.location.assign(url)
      }
    } catch (error) {
      console.error('Unable to open billing portal', error)
    }
  }

  async undoCancellation(): Promise<void> {
    const loading = await firstValueFrom(this.loadingState$)
    if (this.isBillingRestricted || loading.resumeCancellation) {
      return
    }

    try {
      await this.billingService.resumeSubscriptionCancellation()
    } catch (error) {
      console.error('Unable to resume subscription cancellation', error)
    }
  }

}
