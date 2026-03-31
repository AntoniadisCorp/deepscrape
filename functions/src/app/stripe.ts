/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable indent */
// Takes a Firebase user and creates a Stripe customer account
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import {
  db,
  dbName,
  auth as adminAuth,
  stripeSecrets,
  getStripe,
  getStripeWebhookSecret,
} from "./config"
import { grantBillingCredits } from "./billing-credits"
import type { UserInfo } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"
import { onDocumentCreated } from "firebase-functions/v2/firestore"
import { HttpsError, onCall as onCallv2, onRequest } from "firebase-functions/v2/https"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { Users, canPurchaseStandaloneCredits, getPurchasedCreditsAvailable } from "../domain"
import Stripe from "stripe"
import { env } from "../config/env"

type BillingPlanTier = "free" | "trial" | "starter" | "pro" | "enterprise"
type BillingInterval = "payAsYouGo" | "monthly" | "quarterly" | "annually"

const isBillingInterval = (value: string): value is BillingInterval => {
  return value === "payAsYouGo" || value === "monthly" || value === "quarterly" || value === "annually"
}

const getIntervalMonths = (interval: Stripe.Price.Recurring.Interval, count: number): number => {
  return interval === "year" ? count * 12 : count
}

type BillingPriceConfig = {
  amount: number
  currency: "eur"
  stripePriceId?: string
  includedCredits?: number
}

type BillingPlanCatalog = {
  id: BillingPlanTier
  label: string
  description: string
  features: string[]
  prices: Record<BillingInterval, BillingPriceConfig>
}

type CreditPackCatalog = {
  id: string
  label: string
  credits: number
  amount: number
  currency: "eur"
  stripePriceId?: string
}

type CustomCreditsCatalog = {
  enabled: boolean
  minimumCredits: number
  maximumCredits: number
  unitAmount: number
  currency: "eur"
  suggestedCredits: number[]
}

type UserBilling = {
  plan: BillingPlanTier
  status: string
  subscriptionId: string | null
  planInterval?: BillingInterval | null
  cancelAtPeriodEnd?: boolean
  cancelAt?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  graceUntil: string | null
  trialPlanTarget?: BillingPlanTier | null
  trialStartedAt?: string | null
  trialEndsAt?: string | null
  trialUsedAt?: string | null
  trialCreditCapEur?: number
  credits: {
    balance: number
    reserved: number
    purchasedBalance?: number
    purchasedReserved?: number
    includedBalance?: number
    includedReserved?: number
  }
  features: Record<string, boolean>
  updatedAt: FirebaseFirestore.FieldValue
}

const usageThresholds = [0.7, 0.9, 1]

const usageCapsByPlan: Record<BillingPlanTier, number> = {
  free: 100,
  trial: 5000,
  starter: 1000,
  pro: 5000,
  enterprise: 20000,
}

const recurringCreditGrantReasons = new Set(["subscription_create", "subscription_cycle"])

const getIncludedCreditsForPlanInterval = (plan: BillingPlanTier, interval: BillingInterval): number => {
  if (plan === "free") {
    return 0
  }

  if (plan === "trial") {
    return TRIAL_DEFAULT_CREDITS
  }

  const monthlyCredits = usageCapsByPlan[plan]
  if (!monthlyCredits) {
    return 0
  }

  switch (interval) {
  case "payAsYouGo":
    return Math.max(1, Math.round(monthlyCredits * 0.1))
  case "quarterly":
    return monthlyCredits * 3
  case "annually":
    return monthlyCredits * 12
  case "monthly":
  default:
    return monthlyCredits
  }
}

const buildBillingPriceConfig = (
  plan: BillingPlanTier,
  interval: BillingInterval,
  amount: number,
  stripePriceId?: string,
): BillingPriceConfig => ({
  amount,
  currency: "eur",
  stripePriceId,
  includedCredits: getIncludedCreditsForPlanInterval(plan, interval),
})

const addCreditsLedgerEntry = async (args: {
  uid: string
  delta: number
  source: string
  bucket?: "purchased" | "included"
  grantedBy?: string
  reason?: string
  sessionId?: string
  paymentIntentId?: string
  invoiceId?: string
  subscriptionId?: string | null
  plan?: BillingPlanTier
  interval?: BillingInterval
  createdAt?: FirebaseFirestore.FieldValue
}) => {
  const normalizedDelta = Math.floor(args.delta)
  if (!Number.isFinite(normalizedDelta) || normalizedDelta <= 0) {
    return
  }

  const bucket = args.bucket || "purchased"
  const idempotencyKey = args.invoiceId ? `invoice:${args.invoiceId}:${bucket}:${args.reason || args.source}` :
    args.paymentIntentId ? `payment_intent:${args.paymentIntentId}:${bucket}:${args.reason || args.source}` :
      args.sessionId ? `session:${args.sessionId}:${bucket}:${args.reason || args.source}` :
        null

  await grantBillingCredits({
    uid: args.uid,
    amount: normalizedDelta,
    bucket,
    ledger: {
      source: args.source,
      reason: args.reason || null,
      grantedBy: args.grantedBy || null,
      sessionId: args.sessionId || null,
      paymentIntentId: args.paymentIntentId || null,
      invoiceId: args.invoiceId || null,
      subscriptionId: args.subscriptionId || null,
      plan: args.plan || null,
      interval: args.interval || null,
      createdAt: args.createdAt || FieldValue.serverTimestamp(),
      idempotencyKey,
    },
  })
}

const getInvoiceRecurringPriceId = (invoice: Stripe.Invoice): string | null => {
  const lines = invoice.lines?.data || []

  for (const line of lines) {
    const lineWithPrice = line as Stripe.InvoiceLineItem & {
      price?: Stripe.Price | null
      pricing?: {
        price_details?: {
          price?: string | Stripe.Price | null
        }
      }
    }

    const directPriceId = lineWithPrice.price?.id
    if (directPriceId) {
      return directPriceId
    }

    const pricingPrice = lineWithPrice.pricing?.price_details?.price
    if (typeof pricingPrice === "string") {
      return pricingPrice
    }

    if (pricingPrice && typeof pricingPrice === "object" && "id" in pricingPrice) {
      return pricingPrice.id
    }
  }

  return null
}

const toPositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const TRIAL_PERIOD_DAYS = toPositiveInteger(env.STRIPE_TRIAL_PERIOD_DAYS, 14)
const TRIAL_DEFAULT_CREDITS = toPositiveInteger(env.BILLING_TRIAL_DEFAULT_CREDITS, 160)
const TRIAL_DEFAULT_CREDIT_CAP_EUR = toPositiveInteger(env.BILLING_TRIAL_DEFAULT_CREDIT_CAP_EUR, 160)
const CUSTOM_CREDITS_MIN = toPositiveInteger(env.BILLING_CUSTOM_CREDITS_MIN, 50)
const CUSTOM_CREDITS_MAX = toPositiveInteger(env.BILLING_CUSTOM_CREDITS_MAX, 5000)
const CUSTOM_CREDIT_UNIT_AMOUNT_EUR = toPositiveInteger(env.BILLING_CUSTOM_CREDIT_UNIT_AMOUNT_EUR, 19)
const BILLING_RESTRICTED_ROLE_KEYWORDS = ["admin", "manager", "editor"]
const bootstrapAdminEmails = new Set(env.ADMIN_EMAILS.map((item) => item.toLowerCase()))

const customCreditsCatalog: CustomCreditsCatalog = {
  enabled: true,
  minimumCredits: CUSTOM_CREDITS_MIN,
  maximumCredits: CUSTOM_CREDITS_MAX,
  unitAmount: CUSTOM_CREDIT_UNIT_AMOUNT_EUR,
  currency: "eur",
  suggestedCredits: [100, 250, 500, 1000].filter((credits) => credits >= CUSTOM_CREDITS_MIN && credits <= CUSTOM_CREDITS_MAX),
}

const assertCreditModeAllowed = (billing: Pick<UserBilling, "plan" | "subscriptionId"> | undefined): void => {
  if (!canPurchaseStandaloneCredits(billing)) {
    throw new HttpsError(
      "failed-precondition",
      "Credit purchases are only available on the free plan. Active subscribers cannot buy or use standalone credits at the same time.",
    )
  }
}

const normalizeRole = (role: string | null | undefined): string => {
  return (role || "").trim().toLowerCase()
}

const isBillingRestrictedRole = (role: string | null | undefined): boolean => {
  const normalized = normalizeRole(role)
  if (!normalized) {
    return false
  }

  return BILLING_RESTRICTED_ROLE_KEYWORDS.some((keyword) => normalized === keyword || normalized.includes(keyword))
}

const isBillingRestrictedEmail = (email: string | null | undefined): boolean => {
  if (!email) {
    return false
  }

  return bootstrapAdminEmails.has(email.toLowerCase())
}

const isBillingRestrictedUser = (user: Users | undefined, tokenRole?: string | null): boolean => {
  if (isBillingRestrictedRole(tokenRole)) {
    return true
  }

  if (isBillingRestrictedRole(user?.role)) {
    return true
  }

  const userEmail = user?.email || user?.providerData?.[0]?.email || null
  return isBillingRestrictedEmail(userEmail)
}

const getTokenRole = (req: { auth?: { token?: unknown } }): string | null => {
  const token = req.auth?.token as { role?: unknown } | undefined
  const role = token?.role
  return typeof role === "string" ? role : null
}

const assertBillingAllowed = (user: Users | undefined, tokenRole?: string | null): void => {
  if (isBillingRestrictedUser(user, tokenRole)) {
    throw new HttpsError("permission-denied", "Billing is disabled for administrator, manager, and editor accounts")
  }
}

const hasTrialExpired = (billing: UserBilling | undefined): boolean => {
  if (!billing || billing.plan !== "trial" || !billing.trialEndsAt) {
    return false
  }

  const expiry = Date.parse(billing.trialEndsAt)
  return Number.isFinite(expiry) && expiry <= Date.now()
}

const buildFreePlanFromExpiredTrial = (billing: UserBilling | undefined): Partial<UserBilling> => {
  const nowIso = new Date().toISOString()
  return {
    ...getDefaultBillingForPlan("free"),
    plan: "free",
    status: "inactive",
    subscriptionId: null,
    planInterval: null,
    trialPlanTarget: null,
    trialStartedAt: billing?.trialStartedAt || null,
    trialEndsAt: billing?.trialEndsAt || null,
    trialUsedAt: billing?.trialUsedAt || billing?.trialEndsAt || nowIso,
    trialCreditCapEur: 0,
    cancelAtPeriodEnd: false,
    cancelAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    updatedAt: FieldValue.serverTimestamp(),
  }
}

const createAlertId = (type: string, windowId: string) => `${type}_${windowId}`

const emitUsageAlert = async (args: {
  uid: string
  alertId: string
  title: string
  message: string
  severity?: "info" | "warning" | "error"
  metadata?: Record<string, unknown>
}) => {
  const alertRef = db.doc(`users/${args.uid}/usage_alerts/${args.alertId}`)
  const exists = await alertRef.get()
  if (exists.exists) {
    return
  }

  await alertRef.set({
    title: args.title,
    message: args.message,
    severity: args.severity || "info",
    metadata: args.metadata || {},
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  }, { merge: true })
}

const billingPlanCatalog: BillingPlanCatalog[] = [
  {
    id: "free",
    label: "Free",
    description: "Starter access for evaluation",
    features: ["basic_markdown", "single_project", "community_support"],
    prices: {
      payAsYouGo: buildBillingPriceConfig("free", "payAsYouGo", 0),
      monthly: buildBillingPriceConfig("free", "monthly", 0),
      quarterly: buildBillingPriceConfig("free", "quarterly", 0),
      annually: buildBillingPriceConfig("free", "annually", 0),
    },
  },
  {
    id: "trial",
    label: "Trial",
    description: `Time-limited Pro experience (${TRIAL_PERIOD_DAYS} days)`,
    features: ["structured_extraction", "session_reuse", "anti_bot", "identity_crawling", "high_concurrency", "priority_support"],
    prices: {
      payAsYouGo: buildBillingPriceConfig("trial", "payAsYouGo", 0),
      monthly: buildBillingPriceConfig("trial", "monthly", 0),
      quarterly: buildBillingPriceConfig("trial", "quarterly", 0),
      annually: buildBillingPriceConfig("trial", "annually", 0),
    },
  },
  {
    id: "starter",
    label: "Starter",
    description: "For solo operators and small teams",
    features: ["structured_extraction", "session_reuse", "starter_limits"],
    prices: {
      payAsYouGo: buildBillingPriceConfig("starter", "payAsYouGo", 99, env.STRIPE_PRICE_STARTER_PAYG || "price_1T7ZdGFVGcR0rD8f5BmilH75"),
      monthly: buildBillingPriceConfig("starter", "monthly", 999, env.STRIPE_PRICE_STARTER_MONTHLY || "price_1T7Zb1FVGcR0rD8fVTy5nza0"),
      quarterly: buildBillingPriceConfig("starter", "quarterly", 2799, env.STRIPE_PRICE_STARTER_QUARTERLY || "price_1T7ZauFVGcR0rD8f0RpYopcQ"),
      annually: buildBillingPriceConfig("starter", "annually", 9999, env.STRIPE_PRICE_STARTER_ANNUAL || "price_1T7Zb3FVGcR0rD8fJtlFvrct"),
    },
  },
  {
    id: "pro",
    label: "Pro",
    description: "High-throughput crawling and anti-bot support",
    features: ["anti_bot", "identity_crawling", "high_concurrency", "priority_support"],
    prices: {
      payAsYouGo: buildBillingPriceConfig("pro", "payAsYouGo", 199, env.STRIPE_PRICE_PRO_PAYG || "price_1T7ZdGFVGcR0rD8fuvNlSOok"),
      monthly: buildBillingPriceConfig("pro", "monthly", 1999, env.STRIPE_PRICE_PRO_MONTHLY || "price_1T7Zb5FVGcR0rD8ffyGz9ctg"),
      quarterly: buildBillingPriceConfig("pro", "quarterly", 5599, env.STRIPE_PRICE_PRO_QUARTERLY || "price_1T7ZbGFVGcR0rD8f26jtWDAB"),
      annually: buildBillingPriceConfig("pro", "annually", 19999, env.STRIPE_PRICE_PRO_ANNUAL || "price_1T7ZbGFVGcR0rD8fFUWUNcsN"),
    },
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Custom limits, governance and dedicated support",
    features: ["sso", "audit_logs", "dedicated_support", "custom_limits"],
    prices: {
      payAsYouGo: buildBillingPriceConfig("enterprise", "payAsYouGo", 0),
      monthly: buildBillingPriceConfig("enterprise", "monthly", 4999, env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_1T7ZbGFVGcR0rD8fAKK3YSEU"),
      quarterly: buildBillingPriceConfig("enterprise", "quarterly", 14999, env.STRIPE_PRICE_ENTERPRISE_QUARTERLY || "price_1T7ZbGFVGcR0rD8f1XhK9Y0g"),
      annually: buildBillingPriceConfig("enterprise", "annually", 49999, env.STRIPE_PRICE_ENTERPRISE_ANNUAL || "price_1T7ZbeFVGcR0rD8f5z7FBxNR"),
    },
  },
]

const creditPackCatalog: CreditPackCatalog[] = [
  { id: "credits_100", label: "100 credits", credits: 100, amount: 1900, currency: "eur", stripePriceId: env.STRIPE_PRICE_CREDITS_100 || "price_1T7ZbeFVGcR0rD8f0RRlAxOY" },
  { id: "credits_500", label: "500 credits", credits: 500, amount: 7900, currency: "eur", stripePriceId: env.STRIPE_PRICE_CREDITS_500 || "price_1T7ZbeFVGcR0rD8ffuQZ0XgM" },
  { id: "credits_2000", label: "2000 credits", credits: 2000, amount: 24900, currency: "eur", stripePriceId: env.STRIPE_PRICE_CREDITS_2000 || "price_1T7ZbeFVGcR0rD8fX73Nv2Cs" },
]

const getFeaturesFromPlan = (plan: BillingPlanTier): Record<string, boolean> => {
  const allFeatures = [
    "basic_markdown",
    "single_project",
    "structured_extraction",
    "session_reuse",
    "anti_bot",
    "identity_crawling",
    "high_concurrency",
    "priority_support",
    "sso",
    "audit_logs",
    "dedicated_support",
    "custom_limits",
  ]

  const selected = billingPlanCatalog.find((item) => item.id === plan)?.features || []

  return allFeatures.reduce<Record<string, boolean>>((acc, feature) => {
    acc[feature] = selected.includes(feature)
    return acc
  }, {})
}

const getDefaultBillingForPlan = (plan: BillingPlanTier = "free"): UserBilling => {
  const defaultCredits = plan === "trial" ? TRIAL_DEFAULT_CREDITS : 0

  return {
    plan,
    status: plan === "free" ? "inactive" : "active",
    subscriptionId: null,
    cancelAtPeriodEnd: false,
    cancelAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    graceUntil: null,
    trialPlanTarget: null,
    trialStartedAt: null,
    trialEndsAt: null,
    trialUsedAt: null,
    trialCreditCapEur: plan === "trial" ? TRIAL_DEFAULT_CREDIT_CAP_EUR : 0,
    credits: {
      balance: defaultCredits,
      reserved: 0,
      purchasedBalance: 0,
      purchasedReserved: 0,
      includedBalance: defaultCredits,
      includedReserved: 0,
    },
    features: getFeaturesFromPlan(plan),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const submitEnterprisePlanRequest = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const authUser = await adminAuth.getUser(uid)
    const fallbackEmail = (authUser.email || "").trim().toLowerCase()
    const providedEmail = typeof req.data?.contactEmail === "string" ? req.data.contactEmail.trim().toLowerCase() : ""
    const contactEmail = providedEmail || fallbackEmail

    if (!contactEmail || !EMAIL_REGEX.test(contactEmail)) {
      throw new HttpsError("invalid-argument", "A valid contact email is required")
    }

    const workspaceName = typeof req.data?.workspaceName === "string" ? req.data.workspaceName.trim().slice(0, 120) : ""
    const selectedPlan = typeof req.data?.selectedPlan === "string" ? req.data.selectedPlan : null
    const adminRecipients = env.ADMIN_EMAILS.map((item) => item.toLowerCase())

    await db.collection("admin_email_requests").add({
      kind: "enterprise_plan_request",
      uid,
      contactEmail,
      accountEmail: fallbackEmail || null,
      workspaceName: workspaceName || null,
      selectedPlan: selectedPlan || null,
      notifyAdmins: adminRecipients,
      status: "pending",
      source: "service_onboarding",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { success: true }
  }
)

const mapPlanIdToTier = (planId: string): BillingPlanTier => {
  if (planId === "starter" || planId === "pro" || planId === "enterprise" || planId === "free" || planId === "trial") {
    return planId
  }

  return "free"
}

const inferPayAsYouGoPlanFromPayment = (args: {
  amount: number
  currency?: string | null
}): BillingPlanTier | null => {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    return null
  }

  const currency = (args.currency || "").toLowerCase()
  const matches = billingPlanCatalog.filter((plan) => {
    if (plan.id === "free" || plan.id === "trial") {
      return false
    }

    const payg = plan.prices.payAsYouGo
    return payg.amount === args.amount && payg.currency.toLowerCase() === currency
  })

  if (matches.length !== 1) {
    return null
  }

  return matches[0].id
}

const inferRecurringPlanFromPriceId = (priceId: string | null | undefined): {
  plan: BillingPlanTier
  interval: BillingInterval
} | null => {
  if (!priceId) {
    return null
  }

  for (const plan of billingPlanCatalog) {
    if (plan.id === "free" || plan.id === "trial") {
      continue
    }

    const recurringIntervals: BillingInterval[] = ["monthly", "quarterly", "annually"]
    for (const interval of recurringIntervals) {
      if (plan.prices[interval]?.stripePriceId === priceId) {
        return {
          plan: plan.id,
          interval,
        }
      }
    }
  }

  return null
}

type BillingUsageRangeKey =
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"

type BillingUsageGrouping = "day" | "hour"

type BillingUsageWindow = {
  key: BillingUsageRangeKey
  label: string
  startMs: number
  endMs: number
  grouping: BillingUsageGrouping
}

const usageRangeLabels: Record<BillingUsageRangeKey, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
}

const asBillingUsageRangeKey = (value: unknown): BillingUsageRangeKey => {
  if (value === "this_month" || value === "last_month" || value === "last_30_days" || value === "last_90_days") {
    return value
  }

  return "this_month"
}

const resolveBillingUsageWindow = (rangeKey: BillingUsageRangeKey): BillingUsageWindow => {
  const now = new Date()
  const endMs = now.getTime()

  if (rangeKey === "this_month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
    return {
      key: rangeKey,
      label: usageRangeLabels[rangeKey],
      startMs: start.getTime(),
      endMs,
      grouping: "day",
    }
  }

  if (rangeKey === "last_month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
    return {
      key: rangeKey,
      label: usageRangeLabels[rangeKey],
      startMs: start.getTime(),
      endMs: end.getTime(),
      grouping: "day",
    }
  }

  if (rangeKey === "last_90_days") {
    return {
      key: rangeKey,
      label: usageRangeLabels[rangeKey],
      startMs: endMs - (90 * 24 * 60 * 60 * 1000),
      endMs,
      grouping: "day",
    }
  }

  return {
    key: "last_30_days",
    label: usageRangeLabels.last_30_days,
    startMs: endMs - (30 * 24 * 60 * 60 * 1000),
    endMs,
    grouping: "day",
  }
}

const alignToMinuteFloorSeconds = (ms: number): number => Math.floor(ms / 60000) * 60

const alignToMinuteCeilSeconds = (ms: number): number => {
  const ceilMs = Math.ceil(ms / 60000) * 60000
  return Math.floor(ceilMs / 1000)
}

const ensureNonEmptyMeterWindow = (startSeconds: number, endSeconds: number): { startSeconds: number; endSeconds: number } => {
  if (endSeconds > startSeconds) {
    return { startSeconds, endSeconds }
  }

  return {
    startSeconds,
    endSeconds: startSeconds + 60,
  }
}

const toIso = (seconds: number): string => new Date(seconds * 1000).toISOString()

const getInvoiceLinePriceId = (line: Stripe.InvoiceLineItem): string | null => {
  const lineWithPrice = line as Stripe.InvoiceLineItem & {
    price?: Stripe.Price | null
    pricing?: {
      price_details?: {
        price?: string | Stripe.Price | null
      }
    }
  }

  if (lineWithPrice.price?.id) {
    return lineWithPrice.price.id
  }

  const pricingPrice = lineWithPrice.pricing?.price_details?.price
  if (typeof pricingPrice === "string") {
    return pricingPrice
  }

  if (pricingPrice && typeof pricingPrice === "object" && "id" in pricingPrice) {
    return pricingPrice.id
  }

  return null
}

const getInvoiceLineUnitAmount = (line: Stripe.InvoiceLineItem): number | null => {
  const lineAny = line as Stripe.InvoiceLineItem & {
    price?: Stripe.Price | null
  }

  const unitAmountDecimal = lineAny.price?.unit_amount_decimal
  if (unitAmountDecimal !== undefined && unitAmountDecimal !== null) {
    const parsed = Number(unitAmountDecimal)
    return Number.isFinite(parsed) ? parsed : null
  }

  const quantity = Number(line.quantity || 0)
  if (quantity > 0) {
    return Number(line.amount || 0) / quantity
  }

  return null
}

const getPaymentIntentDescription = (paymentIntent: Stripe.PaymentIntent): string | null => {
  if (paymentIntent.description) {
    return paymentIntent.description
  }

  const stripeMetadataDescription = paymentIntent.metadata?.["description"]
  if (stripeMetadataDescription) {
    return stripeMetadataDescription
  }

  return null
}

const resolveUidByStripeCustomer = async (
  customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): Promise<string | null> => {
  const normalizedCustomerId =
    typeof customerId === "string" ? customerId : customerId?.id || null

  if (!normalizedCustomerId) {
    return null
  }

  const userSnap = await db.collection("users")
    .where("stripeId", "==", normalizedCustomerId)
    .limit(1)
    .get()

  if (userSnap.empty) {
    return null
  }

  return userSnap.docs[0].id
}

/* TODO: create a Stripe customer account for the user use most usable data */
type StripeCustomerInput = {
  uid: string
  providerData?: UserInfo[]
  email?: string | null
  displayName?: string | null
  phoneNumber?: string | null
}

export async function createCustomer(firebaseUser: StripeCustomerInput): Promise<Stripe.Response<Stripe.Customer>> {
  const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
  const providerData = firebaseUser?.providerData as UserInfo[] | undefined

  const email = firebaseUser?.email || providerData?.[0]?.email || undefined
  const name = firebaseUser?.displayName || providerData?.[0]?.displayName || undefined
  const phone = firebaseUser?.phoneNumber || providerData?.[0]?.phoneNumber || undefined

  return await stripe.customers.create({
    email,
    name,
    phone: phone || undefined,
    metadata: { firebaseUID: firebaseUser.uid },
  })
}


  const getSubscriptionCycleFields = (subscription: Stripe.Subscription): Partial<UserBilling> => {
    return {
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    }
  }
/* Firebase Functions for stripe Workflow */

export const newStripeCustomer = onDocumentCreated(
  {
    document: "users/{userId}",
    database: dbName,
    secrets: stripeSecrets,
  },
  async (event) => {
    const userId = event.params.userId
    if (!userId) {
      return
    }

    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const userPath = `users/${userId}`

    try {
      const userDoc = await db.doc(userPath).get()
      const firebaseUser = userDoc.data() as Users
      if (!firebaseUser) {
        throw new Error(`User document not found for userId: ${userId}`)
      }

      let fallbackAuthUser: Awaited<ReturnType<typeof adminAuth.getUser>> | null = null
      try {
        fallbackAuthUser = await adminAuth.getUser(userId)
      } catch (authError) {
        console.warn(`Could not load auth profile for user ${userId}:`, authError)
      }

      const userEmail =
        firebaseUser.email ||
        firebaseUser.providerData?.[0]?.email ||
        fallbackAuthUser?.email ||
        ""

      if (isBillingRestrictedUser(firebaseUser)) {
        await db.doc(userPath).set({
          stripeId: FieldValue.delete(),
          subscriptionId: null,
          plan: "free",
          status: "inactive",
          updated_At: new Date(),
        }, { merge: true })
        return
      }

      let stripeId = firebaseUser.stripeId || null
      if (!stripeId && userEmail) {
        const existingCustomers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        })

        if (existingCustomers.data.length > 0) {
          stripeId = existingCustomers.data[0].id
          console.log(`Using existing Stripe customer for email ${userEmail}`)
        }
      }

      if (!stripeId) {
        const customer = await createCustomer({
          uid: userId,
          providerData: firebaseUser.providerData,
          email: userEmail,
          displayName: firebaseUser.providerData?.[0]?.displayName || fallbackAuthUser?.displayName,
          phoneNumber: firebaseUser.providerData?.[0]?.phoneNumber || fallbackAuthUser?.phoneNumber,
        })
        stripeId = customer?.id
        console.log(`Created new Stripe customer for user ${userId}`)
      }

      await db.doc(userPath).set({ stripeId }, { merge: true })
    } catch (error) {
      console.error("Error in newStripeCustomer:", error)
      throw new HttpsError("internal", "Failed to create or link Stripe customer")
    }
  },
)


export const createPaymentIntent = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    // Where the cart id is the cart id of last paymentIntent
    // plan chosen plan from cache memmory
    let clientSecret = ""
    let { amount, currency, cartId } = req.data
    try {
      const userId = req?.auth?.uid
      if (!userId) {
        throw new HttpsError("unauthenticated", "User must be authenticated")
      }

      if (!Number.isFinite(Number(amount)) || Number(amount) < 50) {
        throw new HttpsError("invalid-argument", "Invalid payment amount")
      }

      if (!currency || typeof currency !== "string") {
        throw new HttpsError("invalid-argument", "Invalid currency")
      }

      console.log(`userId : ${userId}`)

      // Get the user from firestore
      const userDoc = await db.doc(`users/${userId}`).get()
      const user = userDoc.data() as Users | undefined
      assertBillingAllowed(user, getTokenRole(req))

      // Get the user's email
      const userEmail: string = user?.providerData?.length ?
        user?.providerData[0]?.email : ""


      // if cartId is not in session of the browser storage
      if (!cartId) {
        /* const listpayment = await stripe.paymentIntents.list({ customer: user?.stripeId })
        // cancel all previous paymentIntent
        listpayment.data.forEach(async (item) => {
            await stripe.paymentIntents.cancel(item.id)
        }) */
        const paymentIntent = await stripe.paymentIntents.create({
          receipt_email: userEmail,
          currency,
          customer: user?.stripeId,
          payment_method_types: ["card"],
          amount: Number(amount),
        })
        // FIXME: need to specified the cartId or create new cart if it doesn't exist
        const newCart = await db.collection(`users/${userId}/paymentcart`).add({
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          created_At: paymentIntent.created,
          lastPaymentAttempt: new Date().getUTCDate(),
        })
        cartId = newCart.id
        clientSecret = paymentIntent.client_secret || "" // or is null
      } else {
        // retrieve the paymentIntent where already Created
        const cartData = await db.doc(`users/${userId}/paymentcart/${cartId}`).get()
        const cart = cartData.data()

        // get the latest used paymentIntentId
        if (cart?.paymentIntentId) {
          const incompleteIntent = await stripe.paymentIntents.retrieve(cart?.paymentIntentId)
          /* if (incompleteIntent.status === "requires_payment_method") {} */
          clientSecret = incompleteIntent.client_secret || "" // or is null
        }
      }

      return { clientSecret, cartId }
    } catch (error) {
      console.log(error)
      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError("internal", "cannot create a payment intent")
    }
  }
)

export const createSetupIntent = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const userId = req.auth?.uid
    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const { cartId } = req.data as { cartId?: string | null }
    const userRef = db.doc(`users/${userId}`)
    const userDoc = await userRef.get()
    const user = userDoc.data() as Users | undefined
    assertBillingAllowed(user, getTokenRole(req))

    const userEmail = user?.email || user?.providerData?.[0]?.email || ""
    let customerId = user?.stripeId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { firebaseUID: userId },
      })
      customerId = customer.id
      await userRef.set({ stripeId: customerId }, { merge: true })
    }

    const createNewSetupIntent = async () => {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: "off_session",
        automatic_payment_methods: {
          enabled: true,
        },
      })

      const createdCart = await db.collection(`users/${userId}/paymentcart`).add({
        setupIntentId: setupIntent.id,
        status: setupIntent.status,
        created_At: setupIntent.created,
        lastPaymentAttempt: new Date().toISOString(),
      })

      return {
        clientSecret: setupIntent.client_secret || "",
        cartId: createdCart.id,
      }
    }

    if (!cartId) {
      return createNewSetupIntent()
    }

    const cartRef = db.doc(`users/${userId}/paymentcart/${cartId}`)
    const cartSnap = await cartRef.get()
    const cart = cartSnap.data() as { setupIntentId?: string } | undefined

    if (!cart?.setupIntentId) {
      return createNewSetupIntent()
    }

    const setupIntent = await stripe.setupIntents.retrieve(cart.setupIntentId)
    if (setupIntent.status === "succeeded" || setupIntent.status === "canceled") {
      return createNewSetupIntent()
    }

    await cartRef.set({
      status: setupIntent.status,
      lastPaymentAttempt: new Date().toISOString(),
    }, { merge: true })

    return {
      clientSecret: setupIntent.client_secret || "",
      cartId,
    }
  },
)


export const startSubscription = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    try {
      // 1. Get user data and validate
      const userId = req?.auth?.uid
      if (!userId) {
        throw new HttpsError("unauthenticated", "User must be authenticated")
      }

      const userDoc = await db.doc(`users/${userId}`).get()
      const user = userDoc.data() as Users | undefined
      assertBillingAllowed(user, getTokenRole(req))
      if (!user || !user.stripeId) {
        throw new HttpsError("not-found", "User or Stripe customer not found")
      }

      // 2. Extract and validate required data
      const { price, paymentMethod, currency } = req.data
      if (!price || !paymentMethod || !currency) {
        throw new HttpsError("invalid-argument", "Missing required payment information")
      }

      // 3. Check for existing subscription
      if (user.subscriptionId) {
        // Option 1: Return existing subscription
        // return { message: "User already has an active subscription", subscriptionId: user.subscriptionId }

        // Option 2: Update existing subscription
        const updatedSub = await stripe.subscriptions.update(user.subscriptionId, {
          items: [{ id: user.itemId, price }],
          // Add other parameters as needed
        })

        // Update the user document with new information
        await db.doc(`users/${userId}`).update({
          status: updatedSub.status,
          itemId: updatedSub.items.data[0].id,
        })

        return { message: "Subscription updated", subscriptionId: updatedSub.id }
      }

      // 4. Check for existing payment methods (PaymentMethods API)
      const paymentMethodsList = await stripe.paymentMethods.list({
        customer: user.stripeId,
        type: "card",
        limit: 100,
      })
      let paymentMethodExists = false
      for (const pm of paymentMethodsList.data) {
        if (pm.id === paymentMethod) {
          paymentMethodExists = true
          break
        }
      }
      // Attach payment method if not already attached
      if (!paymentMethodExists) {
        await stripe.paymentMethods.attach(paymentMethod, { customer: user.stripeId })
      }

      // 5. Set as default payment method for invoices
      await stripe.customers.update(user.stripeId, {
        invoice_settings: { default_payment_method: paymentMethod },
      })

      // 6. Create subscription with idempotency key and default payment method
      const sub = await stripe.subscriptions.create({
        customer: user.stripeId,
        items: [{ price }],
        default_payment_method: paymentMethod,
        currency,
      }, {
        idempotencyKey: `sub_${userId}_${price}`,
      })

      // 7. Update user document
      await db.doc(`users/${userId}`).update({
        status: sub.status,
        currentUsage: 0,
        subscriptionId: sub.id,
        itemId: sub.items.data[0].id,
      })

      return { message: "Subscription created successfully", subscriptionId: sub.id }
    } catch (error) {
      console.error("Error in startSubscription:", error)
      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError("internal", "Failed to start subscription")
    }
  }
)

export const getBillingCatalog = onCallv2(
  { secrets: stripeSecrets },
  async () => {
    return {
      plans: billingPlanCatalog,
      creditPacks: creditPackCatalog,
      customCredits: customCreditsCatalog,
      periods: ["payAsYouGo", "monthly", "quarterly", "annually"] as BillingInterval[],
      currency: "eur",
    }
  }
)

export const validateStripeCatalog = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const userId = req.auth?.uid
    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const authUser = await adminAuth.getUser(userId)
    const userEmail = (authUser.email || "").toLowerCase()
    const allowedAdmins = new Set(env.ADMIN_EMAILS.map((email) => email.toLowerCase()))
    if (!userEmail || !allowedAdmins.has(userEmail)) {
      throw new HttpsError("permission-denied", "Only bootstrap admins can validate Stripe catalog")
    }

    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const issues: Array<{
      id: string
      type: "plan" | "credit"
      ref: string
      severity: "error" | "warning"
      message: string
    }> = []

    const expectedPlanMonths: Record<Exclude<BillingInterval, "payAsYouGo">, number> = {
      monthly: 1,
      quarterly: 3,
      annually: 12,
    }

    const priceRefs = [
      ...billingPlanCatalog.flatMap((plan) =>
        (Object.keys(plan.prices) as BillingInterval[])
          .map((interval) => ({
            id: plan.prices[interval].stripePriceId,
            type: "plan" as const,
            ref: `${plan.id}:${interval}`,
            expectedAmount: plan.prices[interval].amount,
            expectedCurrency: plan.prices[interval].currency,
            expectedRecurring: interval !== "payAsYouGo",
            expectedMonths: interval === "payAsYouGo" ? null : expectedPlanMonths[interval],
          }))
          .filter((item) => Boolean(item.id)),
      ),
      ...creditPackCatalog
        .map((pack) => ({
          id: pack.stripePriceId,
          type: "credit" as const,
          ref: pack.id,
          expectedAmount: pack.amount,
          expectedCurrency: pack.currency,
          expectedRecurring: false,
          expectedMonths: null as number | null,
        }))
        .filter((item) => Boolean(item.id)),
    ] as Array<{
      id?: string
      type: "plan" | "credit"
      ref: string
      expectedAmount: number
      expectedCurrency: string
      expectedRecurring: boolean
      expectedMonths: number | null
    }>

    const products = new Set<string>()
    let validCount = 0

    await Promise.all(priceRefs.map(async (priceRef) => {
      if (!priceRef.id) {
        return
      }

      try {
        const price = await stripe.prices.retrieve(priceRef.id, {
          expand: ["product"],
        })

        if (price.currency !== priceRef.expectedCurrency) {
          issues.push({
            id: priceRef.id,
            type: priceRef.type,
            ref: priceRef.ref,
            severity: "error",
            message: `Currency mismatch: expected ${priceRef.expectedCurrency}, got ${price.currency}`,
          })
        }

        if ((price.unit_amount ?? null) !== priceRef.expectedAmount) {
          issues.push({
            id: priceRef.id,
            type: priceRef.type,
            ref: priceRef.ref,
            severity: "error",
            message: `Amount mismatch: expected ${priceRef.expectedAmount}, got ${price.unit_amount}`,
          })
        }

        if (!price.active) {
          issues.push({
            id: priceRef.id,
            type: priceRef.type,
            ref: priceRef.ref,
            severity: "warning",
            message: "Price exists but is inactive",
          })
        }

        const recurring = price.recurring
        if (priceRef.expectedRecurring && !recurring) {
          issues.push({
            id: priceRef.id,
            type: priceRef.type,
            ref: priceRef.ref,
            severity: "error",
            message: "Expected recurring price but got one-time price",
          })
        }

        if (!priceRef.expectedRecurring && recurring) {
          issues.push({
            id: priceRef.id,
            type: priceRef.type,
            ref: priceRef.ref,
            severity: "error",
            message: "Expected one-time price but got recurring price",
          })
        }

        if (priceRef.expectedRecurring && recurring && priceRef.expectedMonths) {
          const actualMonths = getIntervalMonths(recurring.interval, recurring.interval_count)
          if (actualMonths !== priceRef.expectedMonths) {
            issues.push({
              id: priceRef.id,
              type: priceRef.type,
              ref: priceRef.ref,
              severity: "warning",
              message: `Recurring interval mismatch: expected ${priceRef.expectedMonths} month(s), got ${actualMonths}`,
            })
          }
        }

        const product = price.product
        if (typeof product === "string") {
          products.add(product)
        } else {
          products.add(product.id)
          if ("active" in product && !product.active) {
            issues.push({
              id: priceRef.id,
              type: priceRef.type,
              ref: priceRef.ref,
              severity: "warning",
              message: `Linked product ${product.id} is inactive`,
            })
          }
        }

        validCount += 1
      } catch (error) {
        issues.push({
          id: priceRef.id,
          type: priceRef.type,
          ref: priceRef.ref,
          severity: "error",
          message: `Price lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        })
      }
    }))

    return {
      accountHint: "Sandbox account expected: acct_1Qag9KFVGcR0rD8f",
      checkedPrices: priceRefs.length,
      resolvedPrices: validCount,
      distinctProducts: products.size,
      hasErrors: issues.some((issue) => issue.severity === "error"),
      issues,
    }
  },
)

export const getMyEntitlements = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const userId = req.auth?.uid
    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const billingRef = db.doc(`users/${userId}/billing/current`)
    const userRef = db.doc(`users/${userId}`)
    const [billingSnap, userSnap] = await Promise.all([billingRef.get(), userRef.get()])

    const user = userSnap.data() as Users | undefined
    const tokenRole = getTokenRole(req)

    if (isBillingRestrictedUser(user, tokenRole)) {
      const existingBilling = billingSnap.exists ? billingSnap.data() as UserBilling : undefined
      const restrictedBilling: Partial<UserBilling> = {
        ...getDefaultBillingForPlan("free"),
        plan: "free",
        status: "inactive",
        subscriptionId: null,
        planInterval: null,
        cancelAtPeriodEnd: false,
        cancelAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialUsedAt: existingBilling?.trialUsedAt || null,
        trialStartedAt: existingBilling?.trialStartedAt || null,
        trialEndsAt: existingBilling?.trialEndsAt || null,
        updatedAt: FieldValue.serverTimestamp(),
      }

      await billingRef.set(restrictedBilling, { merge: true })
      await userRef.set({
        plan: "free",
        status: "inactive",
        subscriptionId: null,
        stripeId: FieldValue.delete(),
        updated_At: new Date(),
      }, { merge: true })

      const refreshed = await billingRef.get()
      return { billing: refreshed.data(), userId }
    }

    if (!billingSnap.exists) {
      const initialPlan = mapPlanIdToTier(user?.plan || "free")
      const billing = getDefaultBillingForPlan(initialPlan)
      await billingRef.set(billing, { merge: true })
      return { billing, userId }
    }

    const existingBilling = billingSnap.data() as UserBilling | undefined

    if (hasTrialExpired(existingBilling)) {
      const nextBilling = buildFreePlanFromExpiredTrial(existingBilling)
      await billingRef.set(nextBilling, { merge: true })
      await userRef.set({
        plan: "free",
        status: "inactive",
        subscriptionId: null,
        updated_At: new Date(),
      }, { merge: true })

      const refreshed = await billingRef.get()
      return { billing: refreshed.data(), userId }
    }

    const shouldInferPaygPlan =
      (existingBilling?.plan || "free") === "free" &&
      !existingBilling?.subscriptionId &&
      Boolean(user?.stripeId)

    if (shouldInferPaygPlan && user?.stripeId) {
      try {
        const secret: string | undefined = stripeSecrets.find((entry) => entry.name === "STRIPE_SECRET_KEY")?.value()
        const stripe = getStripe(secret)

        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeId,
          status: "all",
          limit: 10,
        })

        const latestActiveRecurring = subscriptions.data
          .filter((subscription) => ["active", "trialing", "past_due", "unpaid"].includes(subscription.status))
          .sort((a, b) => b.created - a.created)[0]

        const recurringPriceId = latestActiveRecurring?.items?.data?.[0]?.price?.id
        const recurringMatch = inferRecurringPlanFromPriceId(recurringPriceId)

        if (latestActiveRecurring && recurringMatch) {
          const effectivePlan: BillingPlanTier = latestActiveRecurring.status === "trialing" ? "trial" : recurringMatch.plan
          await billingRef.set({
            plan: effectivePlan,
            planInterval: recurringMatch.interval,
            status: latestActiveRecurring.status,
            subscriptionId: latestActiveRecurring.id,
            features: getFeaturesFromPlan(effectivePlan),
            ...getSubscriptionCycleFields(latestActiveRecurring),
            ...(latestActiveRecurring.status === "trialing" ? {
              trialPlanTarget: recurringMatch.plan,
              trialStartedAt: new Date(latestActiveRecurring.current_period_start * 1000).toISOString(),
              trialEndsAt: latestActiveRecurring.trial_end ? new Date(latestActiveRecurring.trial_end * 1000).toISOString() : null,
              trialUsedAt: new Date().toISOString(),
              trialCreditCapEur: TRIAL_DEFAULT_CREDIT_CAP_EUR,
            } : {
              trialPlanTarget: null,
              trialStartedAt: null,
              trialEndsAt: null,
            }),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })

          await db.doc(`users/${userId}`).set({
            plan: effectivePlan,
            status: latestActiveRecurring.status,
            subscriptionId: latestActiveRecurring.id,
            updated_At: new Date(),
          }, { merge: true })

          const refreshed = await billingRef.get()
          return { billing: refreshed.data(), userId }
        }

        const paymentIntents = await stripe.paymentIntents.list({
          customer: user.stripeId,
          limit: 20,
        })

        const latestSucceeded = paymentIntents.data
          .filter((intent) => intent.status === "succeeded")
          .sort((a, b) => b.created - a.created)[0]

        const inferredPlan = latestSucceeded ? inferPayAsYouGoPlanFromPayment({
          amount: latestSucceeded.amount,
          currency: latestSucceeded.currency,
        }) : null

        if (inferredPlan) {
          await billingRef.set({
            ...getDefaultBillingForPlan(inferredPlan),
            plan: inferredPlan,
            planInterval: "payAsYouGo",
            status: "active",
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })

          await db.doc(`users/${userId}`).set({
            plan: inferredPlan,
            status: "active",
            updated_At: new Date(),
          }, { merge: true })

          const refreshed = await billingRef.get()
          return { billing: refreshed.data(), userId }
        }
      } catch (error) {
        console.warn("Entitlement inference from successful pay-as-you-go payments failed:", error)
      }
    }

    return { billing: existingBilling, userId }
  }
)

export const startTrial = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const userId = req.auth?.uid
    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const userRef = db.doc(`users/${userId}`)
    const billingRef = db.doc(`users/${userId}/billing/current`)
    const [userSnap, billingSnap] = await Promise.all([userRef.get(), billingRef.get()])
    const user = userSnap.data() as Users | undefined

    assertBillingAllowed(user, getTokenRole(req))

    const billing = billingSnap.data() as UserBilling | undefined
    const alreadyUsedTrial = Boolean(billing?.trialUsedAt)
    if (alreadyUsedTrial) {
      throw new HttpsError("failed-precondition", "Trial can only be used once per account")
    }

    if (billing?.plan && billing.plan !== "free" && billing.plan !== "trial") {
      throw new HttpsError("failed-precondition", "Trial can only be started from the free plan")
    }

    const now = new Date()
    const endsAt = new Date(now.getTime() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000)

    const trialBilling: Partial<UserBilling> = {
      ...getDefaultBillingForPlan("trial"),
      plan: "trial",
      status: "active",
      subscriptionId: null,
      planInterval: null,
      trialPlanTarget: "pro",
      trialStartedAt: now.toISOString(),
      trialEndsAt: endsAt.toISOString(),
      trialUsedAt: now.toISOString(),
      trialCreditCapEur: TRIAL_DEFAULT_CREDIT_CAP_EUR,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await billingRef.set(trialBilling, { merge: true })
    await userRef.set({
      plan: "trial",
      status: "active",
      subscriptionId: null,
      updated_At: now,
    }, { merge: true })

    const refreshed = await billingRef.get()
    return {
      billing: refreshed.data(),
      userId,
      trialStartedAt: trialBilling.trialStartedAt,
      trialEndsAt: trialBilling.trialEndsAt,
    }
  },
)

export const getBillingUsage = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const userId = req.auth?.uid
    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const data = (req.data || {}) as {
      range?: BillingUsageRangeKey
    }

    const rangeKey = asBillingUsageRangeKey(data.range)
    const window = resolveBillingUsageWindow(rangeKey)
    const createdRange: Stripe.RangeQueryParam = {
      gte: Math.floor(window.startMs / 1000),
      lte: Math.floor(window.endMs / 1000),
    }

    const userSnap = await db.doc(`users/${userId}`).get()
    const user = userSnap.data() as Users | undefined
    const stripeCustomerId = user?.stripeId || null

    const emptyResponse = {
      range: {
        key: window.key,
        label: window.label,
        start: new Date(window.startMs).toISOString(),
        end: new Date(window.endMs).toISOString(),
        grouping: window.grouping,
      },
      summary: {
        currency: "eur",
        totalInvoiced: 0,
        totalPaid: 0,
        totalMeteredUnits: 0,
      },
      meteredUsage: {
        meters: [] as Array<{
          meterId: string
          displayName: string
          eventName: string
          aggregatedValue: number
          timeline: Array<{
            start: string
            end: string
            value: number
          }>
        }>,
      },
      invoices: [] as Array<{
        id: string
        number: string | null
        status: string | null
        total: number
        amountPaid: number
        currency: string
        periodStart: string | null
        periodEnd: string | null
        createdAt: string
        hostedInvoiceUrl: string | null
      }>,
      payments: [] as Array<{
        id: string
        status: string
        amount: number
        currency: string
        createdAt: string
        description: string | null
      }>,
      breakdown: [] as Array<{
        id: string
        date: string
        source: "invoice_line" | "payment" | "meter"
        category: string
        description: string
        quantity: number | null
        unitAmount: number | null
        total: number
        currency: string
        referenceId: string
      }>,
    }

    if (!stripeCustomerId) {
      return emptyResponse
    }

    const secret: string | undefined = stripeSecrets.find((entry) => entry.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)

    const [invoiceList, paymentIntentList, meterList] = await Promise.all([
      stripe.invoices.list({
        customer: stripeCustomerId,
        created: createdRange,
        limit: 100,
      }),
      stripe.paymentIntents.list({
        customer: stripeCustomerId,
        created: createdRange,
        limit: 100,
      }),
      stripe.billing.meters.list({
        status: "active",
        limit: 25,
      }).catch(() => ({ data: [] as Stripe.Billing.Meter[] } as { data: Stripe.Billing.Meter[] })),
    ])

    const invoiceRows = invoiceList.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: Number(invoice.total || 0),
      amountPaid: Number(invoice.amount_paid || 0),
      currency: (invoice.currency || "eur").toLowerCase(),
      periodStart: invoice.period_start ? toIso(invoice.period_start) : null,
      periodEnd: invoice.period_end ? toIso(invoice.period_end) : null,
      createdAt: toIso(invoice.created),
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    }))

    const paymentRows = paymentIntentList.data.map((paymentIntent) => ({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: Number(paymentIntent.amount || 0),
      currency: (paymentIntent.currency || "eur").toLowerCase(),
      createdAt: toIso(paymentIntent.created),
      description: getPaymentIntentDescription(paymentIntent),
    }))

    const meterWindowStart = alignToMinuteFloorSeconds(window.startMs)
    const meterWindowEnd = alignToMinuteCeilSeconds(window.endMs)
    const safeMeterWindow = ensureNonEmptyMeterWindow(meterWindowStart, meterWindowEnd)

    const meterSummaryRows = await Promise.all(meterList.data.map(async (meter) => {
      try {
        const summaries = await stripe.billing.meters.listEventSummaries(meter.id, {
          customer: stripeCustomerId,
          start_time: safeMeterWindow.startSeconds,
          end_time: safeMeterWindow.endSeconds,
          value_grouping_window: window.grouping,
          limit: 100,
        })

        const timeline = summaries.data.map((summary) => ({
          start: toIso(summary.start_time),
          end: toIso(summary.end_time),
          value: Number(summary.aggregated_value || 0),
        }))

        const aggregatedValue = timeline.reduce((acc, item) => acc + item.value, 0)

        return {
          meterId: meter.id,
          displayName: meter.display_name,
          eventName: meter.event_name,
          aggregatedValue,
          timeline,
        }
      } catch {
        return {
          meterId: meter.id,
          displayName: meter.display_name,
          eventName: meter.event_name,
          aggregatedValue: 0,
          timeline: [],
        }
      }
    }))

    const breakdownFromInvoices = invoiceList.data.flatMap((invoice) => {
      const lines = invoice.lines?.data || []

      return lines.map((line, lineIndex) => {
        const lineWithPrice = line as Stripe.InvoiceLineItem & { price?: Stripe.Price | null }
        const recurringType = lineWithPrice.price?.recurring ? "license" : "one_time"
        const quantity = line.quantity ?? null
        const unitAmount = getInvoiceLineUnitAmount(line)
        const amount = Number(line.amount || 0)
        const linePriceId = getInvoiceLinePriceId(line)

        return {
          id: `${invoice.id}_line_${lineIndex}`,
          date: toIso(line.period?.end || invoice.created),
          source: "invoice_line" as const,
          category: recurringType,
          description: line.description || linePriceId || "Invoice line",
          quantity: quantity === null ? null : Number(quantity),
          unitAmount,
          total: amount,
          currency: (invoice.currency || "eur").toLowerCase(),
          referenceId: invoice.id,
        }
      })
    })

    const breakdownFromPayments = paymentRows.map((payment) => ({
      id: `${payment.id}_payment`,
      date: payment.createdAt,
      source: "payment" as const,
      category: "payment",
      description: payment.description || "Payment received",
      quantity: 1,
      unitAmount: payment.amount,
      total: payment.amount,
      currency: payment.currency,
      referenceId: payment.id,
    }))

    const breakdownFromMeters = meterSummaryRows.flatMap((meter) =>
      meter.timeline.map((item, timelineIndex) => ({
        id: `${meter.meterId}_meter_${timelineIndex}`,
        date: item.end,
        source: "meter" as const,
        category: "metered_usage",
        description: `${meter.displayName} (${meter.eventName})`,
        quantity: item.value,
        unitAmount: null,
        total: item.value,
        currency: "units",
        referenceId: meter.meterId,
      })))

    const breakdown = [
      ...breakdownFromInvoices,
      ...breakdownFromPayments,
      ...breakdownFromMeters,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalInvoiced = invoiceRows.reduce((acc, row) => acc + row.total, 0)
    const totalPaid = invoiceRows.reduce((acc, row) => acc + row.amountPaid, 0)
    const totalMeteredUnits = meterSummaryRows.reduce((acc, row) => acc + row.aggregatedValue, 0)

    return {
      range: {
        key: window.key,
        label: window.label,
        start: new Date(window.startMs).toISOString(),
        end: new Date(window.endMs).toISOString(),
        grouping: window.grouping,
      },
      summary: {
        currency: invoiceRows[0]?.currency || "eur",
        totalInvoiced,
        totalPaid,
        totalMeteredUnits,
      },
      meteredUsage: {
        meters: meterSummaryRows,
      },
      invoices: invoiceRows,
      payments: paymentRows,
      breakdown,
    }
  },
)

export const createCheckoutSession = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const userId = req.auth?.uid
    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const {
      planId,
      interval = "monthly",
      successUrl,
      cancelUrl,
      quantity = 1,
      customCredits,
      checkoutRequestId,
    } = req.data as {
      planId: string
      interval?: BillingInterval
      successUrl: string
      cancelUrl: string
      quantity?: number
      customCredits?: number
      checkoutRequestId?: string
    }

    if (!planId || !successUrl || !cancelUrl) {
      throw new HttpsError("invalid-argument", "Missing required checkout arguments")
    }

    if (!isBillingInterval(interval)) {
      throw new HttpsError("invalid-argument", "Invalid billing interval")
    }

    const userSnap = await db.doc(`users/${userId}`).get()
    const user = userSnap.data() as Users | undefined
    const billingSnap = await db.doc(`users/${userId}/billing/current`).get()
    const billing = billingSnap.data() as UserBilling | undefined
  assertBillingAllowed(user, getTokenRole(req))
    const userEmail = user?.email || user?.providerData?.[0]?.email || ""

    let customerId = user?.stripeId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { firebaseUID: userId },
      })
      customerId = customer.id
      await db.doc(`users/${userId}`).set({ stripeId: customerId }, { merge: true })
    }

    const selectedPlan = billingPlanCatalog.find((item) => item.id === planId)
    const selectedPack = creditPackCatalog.find((item) => item.id === planId)
    const isCustomCredits = planId === "custom_credits"

    if (!selectedPlan && !selectedPack && !isCustomCredits) {
      throw new HttpsError("not-found", "Unknown plan or credit pack")
    }

    const isCreditPack = Boolean(selectedPack)
    const isPayAsYouGoPlan = Boolean(selectedPlan) && interval === "payAsYouGo"
    const normalizedCustomCredits = isCustomCredits ? Math.floor(Number(customCredits || 0)) : 0

    if (isCreditPack || isCustomCredits) {
      assertCreditModeAllowed(billing)
    }

    if (isCustomCredits) {
      if (!customCreditsCatalog.enabled) {
        throw new HttpsError("failed-precondition", "Custom credits are currently disabled")
      }

      if (!Number.isFinite(normalizedCustomCredits) || normalizedCustomCredits < customCreditsCatalog.minimumCredits || normalizedCustomCredits > customCreditsCatalog.maximumCredits) {
        throw new HttpsError(
          "invalid-argument",
          `Custom credits must be between ${customCreditsCatalog.minimumCredits} and ${customCreditsCatalog.maximumCredits}`,
        )
      }
    }

    const selectedPlanPrice = selectedPlan ? selectedPlan.prices[interval] : undefined
    const stripePriceId = isCreditPack ? selectedPack?.stripePriceId : selectedPlanPrice?.stripePriceId

    if (!isCustomCredits && !stripePriceId) {
      throw new HttpsError("failed-precondition", "Stripe price id is missing for selected option")
    }

    const checkoutMode: Stripe.Checkout.SessionCreateParams.Mode = (isCreditPack || isPayAsYouGoPlan || isCustomCredits) ? "payment" : "subscription"

    let trialPeriodDays: number | undefined
    if (checkoutMode === "subscription" && selectedPlan?.id === "pro") {
      const billingRef = db.doc(`users/${userId}/billing/current`)
      const billingSnap = await billingRef.get()
      const billing = billingSnap.data() as UserBilling | undefined

      const alreadyUsedTrial = Boolean(
        billing?.trialUsedAt ||
        billing?.plan === "trial" ||
        billing?.trialPlanTarget
      )

      if (!alreadyUsedTrial) {
        trialPeriodDays = TRIAL_PERIOD_DAYS
      }
    }

    const checkoutMetadata = {
      uid: userId,
      planId,
      interval,
      checkoutType: isCustomCredits ? "custom_credits" : isCreditPack ? "credits" : isPayAsYouGoPlan ? "plan_payg" : "plan",
      customCredits: isCustomCredits ? String(normalizedCustomCredits) : "0",
      trialApplied: trialPeriodDays ? "true" : "false",
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = isCustomCredits ? [{
      price_data: {
        currency: customCreditsCatalog.currency,
        unit_amount: customCreditsCatalog.unitAmount,
        product_data: {
          name: "DeepScrape Custom Credits",
          description: `${normalizedCustomCredits} custom credits for usage-based access on the free plan`,
        },
      },
      quantity: normalizedCustomCredits,
    }] : [{
      price: stripePriceId,
      quantity: isCreditPack ? Math.max(1, quantity) : 1,
    }]

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: checkoutMode,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: checkoutMetadata,
      payment_intent_data: checkoutMode === "payment" ? {
        metadata: checkoutMetadata,
      } : undefined,
      subscription_data: checkoutMode === "subscription" ? {
        metadata: checkoutMetadata,
        trial_period_days: trialPeriodDays,
        trial_settings: trialPeriodDays ? {
          end_behavior: {
            missing_payment_method: "cancel",
          },
        } : undefined,
      } : undefined,
      client_reference_id: userId,
      allow_promotion_codes: true,
    }, {
      idempotencyKey: `checkout_${userId}_${planId}_${interval}_${isCustomCredits ? normalizedCustomCredits : Math.max(1, quantity)}_${checkoutRequestId || Date.now()}`,
    })

    return {
      url: session.url,
      sessionId: session.id,
    }
  }
)

export const createBillingPortalSession = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const userId = req.auth?.uid
    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const { returnUrl } = req.data as { returnUrl?: string }
    if (!returnUrl) {
      throw new HttpsError("invalid-argument", "Missing returnUrl")
    }

    const userSnap = await db.doc(`users/${userId}`).get()
    const user = userSnap.data() as Users | undefined
    assertBillingAllowed(user, getTokenRole(req))
    if (!user?.stripeId) {
      throw new HttpsError("failed-precondition", "Stripe customer not found")
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeId,
      return_url: returnUrl,
    })

    return { url: portal.url }
  }
)

export const resumeSubscriptionCancellation = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const secret: string | undefined = stripeSecrets.find((entry) => entry.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const userId = req.auth?.uid

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const userRef = db.doc(`users/${userId}`)
    const billingRef = db.doc(`users/${userId}/billing/current`)
    const [userSnap, billingSnap] = await Promise.all([userRef.get(), billingRef.get()])

    const user = userSnap.data() as Users | undefined
    assertBillingAllowed(user, getTokenRole(req))

    const billing = billingSnap.data() as UserBilling | undefined
    const subscriptionId = billing?.subscriptionId || user?.subscriptionId || null
    if (!subscriptionId) {
      throw new HttpsError("failed-precondition", "No active subscription found")
    }

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    const recurringPriceId = updatedSubscription.items.data[0]?.price?.id
    const recurringMatch = inferRecurringPlanFromPriceId(recurringPriceId)
    const currentPlan = billing?.plan || mapPlanIdToTier(user?.plan || "free")
    const effectivePlan: BillingPlanTier = updatedSubscription.status === "trialing" ?
     "trial" : (recurringMatch?.plan || currentPlan)

    await billingRef.set({
      ...getDefaultBillingForPlan(effectivePlan),
      plan: effectivePlan,
      planInterval: recurringMatch?.interval || billing?.planInterval || null,
      status: updatedSubscription.status,
      subscriptionId: updatedSubscription.id,
      features: getFeaturesFromPlan(effectivePlan),
      ...getSubscriptionCycleFields(updatedSubscription),
      ...(updatedSubscription.status === "trialing" ? {
        trialPlanTarget: recurringMatch?.plan || billing?.trialPlanTarget || "pro",
        trialStartedAt: billing?.trialStartedAt || new Date(updatedSubscription.current_period_start * 1000).toISOString(),
        trialEndsAt: updatedSubscription.trial_end ? new Date(updatedSubscription.trial_end * 1000).toISOString() : null,
        trialUsedAt: billing?.trialUsedAt || new Date().toISOString(),
        trialCreditCapEur: billing?.trialCreditCapEur || TRIAL_DEFAULT_CREDIT_CAP_EUR,
      } : {
        trialPlanTarget: null,
        trialStartedAt: null,
        trialEndsAt: null,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    await userRef.set({
      plan: effectivePlan,
      status: updatedSubscription.status,
      subscriptionId: updatedSubscription.id,
      updated_At: new Date(),
    }, { merge: true })

    const refreshed = await billingRef.get()
    return {
      billing: refreshed.data(),
      subscriptionId: updatedSubscription.id,
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
    }
  }
)

export const verifyCheckoutSession = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const secret: string | undefined = stripeSecrets.find((entry) => entry.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const userId = req.auth?.uid

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const userSnap = await db.doc(`users/${userId}`).get()
    const user = userSnap.data() as Users | undefined
    assertBillingAllowed(user, getTokenRole(req))

    const { sessionId } = req.data as { sessionId?: string }
    if (!sessionId) {
      throw new HttpsError("invalid-argument", "Missing sessionId")
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const sessionOwner = session.client_reference_id || session.metadata?.uid
    if (!sessionOwner || sessionOwner !== userId) {
      throw new HttpsError("permission-denied", "Session does not belong to current user")
    }

    const isCompleted = session.status === "complete"
    const isPaidOneTime = session.mode === "payment" && session.payment_status === "paid"
    const isValidSubscription = session.mode === "subscription" && (
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required"
    )

    return {
      valid: isCompleted && (isPaidOneTime || isValidSubscription),
      mode: session.mode,
      paymentStatus: session.payment_status,
      status: session.status,
      sessionId: session.id,
    }
  }
)

export const stripeWebhook = onRequest({ secrets: stripeSecrets }, async (req, res) => {
    const stripeSecret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(stripeSecret)
    const webhookSecret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_WEBHOOK_SECRET")?.value()
    const stripeWebhookSecret = getStripeWebhookSecret(webhookSecret)
    if (!stripeWebhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET")
      res.status(500).send("Webhook secret missing")
      return
    }

    const signature = req.headers["stripe-signature"]
    if (!signature || Array.isArray(signature)) {
      res.status(400).send("Missing stripe signature")
      return
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret)
    } catch (error) {
      console.error("Webhook signature verification failed", error)
      res.status(400).send("Invalid signature")
      return
    }

    const eventRef = db.doc(`stripe_events/${event.id}`)
    try {
      await eventRef.create({
        type: event.type,
        processingStartedAt: FieldValue.serverTimestamp(),
      })
    } catch {
      res.status(200).send("Already processed")
      return
    }

    try {
      switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const uid = session.metadata?.uid || session.client_reference_id
        if (!uid) {
          break
        }

        const protectedUserSnap = await db.doc(`users/${uid}`).get()
        const protectedUser = protectedUserSnap.data() as Users | undefined
        if (isBillingRestrictedUser(protectedUser)) {
          await db.doc(`users/${uid}/billing/current`).set({
            ...getDefaultBillingForPlan("free"),
            plan: "free",
            status: "inactive",
            subscriptionId: null,
            planInterval: null,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })
          await db.doc(`users/${uid}`).set({
            plan: "free",
            status: "inactive",
            subscriptionId: null,
            stripeId: FieldValue.delete(),
            updated_At: new Date(),
          }, { merge: true })
          break
        }

        const checkoutType = session.metadata?.checkoutType
        const selectedPlanId = session.metadata?.planId || "free"
        const selectedInterval = (session.metadata?.interval as BillingInterval) || "monthly"
        const billingRef = db.doc(`users/${uid}/billing/current`)
        const userRef = db.doc(`users/${uid}`)

        if (checkoutType === "credits" || checkoutType === "custom_credits") {
          const pack = creditPackCatalog.find((item) => item.id === selectedPlanId)
          const incrementBy = checkoutType === "custom_credits" ? Math.floor(Number(session.metadata?.customCredits || 0)) : (pack?.credits || 0)
          await addCreditsLedgerEntry({
            uid,
            delta: incrementBy,
            source: checkoutType === "custom_credits" ? "custom_credits_checkout" : "stripe_checkout",
            bucket: "purchased",
            reason: checkoutType === "custom_credits" ? "custom_credits" : "credit_pack",
            sessionId: session.id,
          })
        } else {
          const selectedPlan = mapPlanIdToTier(selectedPlanId)
          let trialMeta: Partial<UserBilling> = {}
          let effectivePlan: BillingPlanTier = selectedPlan
          let subscriptionMeta: Partial<UserBilling> = {}
          let effectiveStatus = "active"
          let effectiveSubscriptionId: string | null = typeof session.subscription === "string" ? session.subscription : null

          if (typeof session.subscription === "string") {
            const subscription = await stripe.subscriptions.retrieve(session.subscription)
            effectiveStatus = subscription.status
            effectiveSubscriptionId = subscription.id
            subscriptionMeta = getSubscriptionCycleFields(subscription)

            if (subscription.status === "trialing") {
              effectivePlan = "trial"
              trialMeta = {
                trialPlanTarget: selectedPlan,
                trialStartedAt: new Date(subscription.current_period_start * 1000).toISOString(),
                trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                trialUsedAt: new Date().toISOString(),
                trialCreditCapEur: TRIAL_DEFAULT_CREDIT_CAP_EUR,
              }
            }
          }

          await billingRef.set({
            ...getDefaultBillingForPlan(effectivePlan),
            status: effectiveStatus,
            subscriptionId: effectiveSubscriptionId,
            planInterval: selectedInterval,
            ...subscriptionMeta,
            ...trialMeta,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })

          await userRef.set({
            plan: effectivePlan,
            status: effectiveStatus,
            subscriptionId: effectiveSubscriptionId,
            updated_At: new Date(),
          }, { merge: true })

          if (checkoutType === "plan_payg") {
            const includedCredits = getIncludedCreditsForPlanInterval(selectedPlan, "payAsYouGo")
            await addCreditsLedgerEntry({
              uid,
              delta: includedCredits,
              source: "plan_payg_checkout",
              bucket: "included",
              reason: "plan_payg",
              sessionId: session.id,
              plan: selectedPlan,
              interval: "payAsYouGo",
            })
          }
        }
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const uid = invoice.metadata?.uid || await resolveUidByStripeCustomer(invoice.customer)
        if (!uid) {
          break
        }

        const graceUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString()
        await db.doc(`users/${uid}/billing/current`).set({
          status: "past_due",
          graceUntil,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })
        break
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const uid = invoice.metadata?.uid || await resolveUidByStripeCustomer(invoice.customer)
        if (!uid) {
          break
        }

        const billingRef = db.doc(`users/${uid}/billing/current`)
        const billingSnap = await billingRef.get()
        const billing = billingSnap.data() as UserBilling | undefined

        let plan: BillingPlanTier | undefined
        let planInterval: BillingInterval | undefined
        let features: Record<string, boolean> | undefined
        let trialFields: Partial<UserBilling> = {}
        const recurringPriceId = getInvoiceRecurringPriceId(invoice)
        const recurringMatch = inferRecurringPlanFromPriceId(recurringPriceId)

        if (recurringMatch) {
          plan = recurringMatch.plan
          planInterval = recurringMatch.interval
          features = getFeaturesFromPlan(plan)
        }

        if (billing?.plan === "trial" && billing.trialPlanTarget) {
          plan = billing.trialPlanTarget
          planInterval =
            billing.planInterval === "monthly" || billing.planInterval === "quarterly" || billing.planInterval === "annually" ?
              billing.planInterval :
              planInterval
          features = getFeaturesFromPlan(plan)
          trialFields = {
            trialPlanTarget: null,
            trialStartedAt: null,
            trialEndsAt: null,
          }
        }

        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : billing?.subscriptionId || null
        const shouldGrantIncludedCredits = Boolean(
          subscriptionId &&
          plan &&
          planInterval &&
          invoice.amount_paid > 0 &&
          recurringCreditGrantReasons.has(invoice.billing_reason || ""),
        )

        await billingRef.set({
          status: "active",
          ...(plan ? { plan } : {}),
          ...(planInterval ? { planInterval } : {}),
          ...(features ? { features } : {}),
          ...trialFields,
          graceUntil: null,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        if (shouldGrantIncludedCredits && plan && planInterval) {
          await addCreditsLedgerEntry({
            uid,
            delta: getIncludedCreditsForPlanInterval(plan, planInterval),
            source: "subscription_cycle",
            bucket: "included",
            reason: invoice.billing_reason || "subscription_cycle",
            invoiceId: invoice.id,
            subscriptionId,
            plan,
            interval: planInterval,
          })
        }

        if (plan) {
          await db.doc(`users/${uid}`).set({
            plan,
            status: "active",
            updated_At: new Date(),
          }, { merge: true })
        }
        break
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const uid = paymentIntent.metadata?.uid || await resolveUidByStripeCustomer(paymentIntent.customer)
        if (!uid) {
          break
        }

        const protectedUserSnap = await db.doc(`users/${uid}`).get()
        const protectedUser = protectedUserSnap.data() as Users | undefined
        if (isBillingRestrictedUser(protectedUser)) {
          break
        }

        const checkoutType = paymentIntent.metadata?.checkoutType
        const selectedPlanId = paymentIntent.metadata?.planId

        const inferredPlan = selectedPlanId ? mapPlanIdToTier(selectedPlanId) : inferPayAsYouGoPlanFromPayment({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        })

        if (checkoutType === "credits") {
          break
        }

        if (!inferredPlan || inferredPlan === "free" || inferredPlan === "trial") {
          break
        }

        await db.doc(`users/${uid}/billing/current`).set({
          ...getDefaultBillingForPlan(inferredPlan),
          plan: inferredPlan,
          planInterval: "payAsYouGo",
          status: "active",
          cancelAtPeriodEnd: false,
          cancelAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        if (!checkoutType) {
          await addCreditsLedgerEntry({
            uid,
            delta: getIncludedCreditsForPlanInterval(inferredPlan, "payAsYouGo"),
            source: "plan_payg_payment_intent",
            bucket: "included",
            reason: "plan_payg",
            paymentIntentId: paymentIntent.id,
            plan: inferredPlan,
            interval: "payAsYouGo",
          })
        }

        await db.doc(`users/${uid}`).set({
          plan: inferredPlan,
          status: "active",
          updated_At: new Date(),
        }, { merge: true })
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const uid = subscription.metadata?.uid || await resolveUidByStripeCustomer(subscription.customer)
        if (!uid) {
          break
        }

        const protectedUserSnap = await db.doc(`users/${uid}`).get()
        const protectedUser = protectedUserSnap.data() as Users | undefined
        if (isBillingRestrictedUser(protectedUser)) {
          break
        }

        const recurringPriceId = subscription.items.data[0]?.price?.id
        const recurringMatch = inferRecurringPlanFromPriceId(recurringPriceId)
        if (!recurringMatch) {
          break
        }

        const effectivePlan: BillingPlanTier = subscription.status === "trialing" ? "trial" : recurringMatch.plan

        await db.doc(`users/${uid}/billing/current`).set({
          plan: effectivePlan,
          planInterval: recurringMatch.interval,
          status: subscription.status,
          subscriptionId: subscription.id,
          features: getFeaturesFromPlan(effectivePlan),
          ...getSubscriptionCycleFields(subscription),
          ...(subscription.status === "trialing" ? {
            trialPlanTarget: recurringMatch.plan,
            trialStartedAt: new Date(subscription.current_period_start * 1000).toISOString(),
            trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            trialUsedAt: new Date().toISOString(),
            trialCreditCapEur: TRIAL_DEFAULT_CREDIT_CAP_EUR,
          } : {
            trialPlanTarget: null,
            trialStartedAt: null,
            trialEndsAt: null,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        await db.doc(`users/${uid}`).set({
          plan: effectivePlan,
          status: subscription.status,
          subscriptionId: subscription.id,
          updated_At: new Date(),
        }, { merge: true })
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const uid = subscription.metadata?.uid || await resolveUidByStripeCustomer(subscription.customer)
        if (!uid) {
          break
        }

        await db.doc(`users/${uid}/billing/current`).set({
          ...getDefaultBillingForPlan("free"),
          status: "inactive",
          cancelAtPeriodEnd: false,
          cancelAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        await db.doc(`users/${uid}`).set({
          plan: "free",
          status: "inactive",
          subscriptionId: null,
          updated_At: new Date(),
        }, { merge: true })
        break
      }
      default:
        break
      }

      await eventRef.set({
        type: event.type,
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
      }, { merge: true })

      res.status(200).send("ok")
    } catch (error) {
      console.error("stripeWebhook processing failed", error)
      res.status(500).send("Webhook processing error")
    }
  })

export const updateUsage = onDocumentCreated(
  {
    document: "projects/{projectId}",
    database: dbName,
    secrets: stripeSecrets,
  },
  async (event) => {
    const snap = event.data
    if (!snap) {
      return
    }
    const secret: string | undefined = stripeSecrets.find((secret) => secret.name === "STRIPE_SECRET_KEY")?.value()
    const stripe = getStripe(secret)
    const project = snap.data() as { userId?: string }
    const userId = project?.userId
    if (!userId) {
      return
    }

    const userRef = db.doc(`users/${userId}`)

    const userDoc = await userRef.get()
    const user = userDoc.data()

    if (!user?.stripeId || !user?.itemId) {
      return
    }

    await stripe.billing.meterEvents.create(
      {
        event_name: "blaze_plan_monthly",
        payload: {
          "stripe_customer_id": user.stripeId,
          "value": "1",
        },
        timestamp: Math.floor(snap.createTime.toDate().getTime() / 1000),
      },
      {
        idempotencyKey: snap.id,
      },
    )
    await stripe.subscriptionItems.createUsageRecord(
      user.itemId,
      {
        quantity: 1,
        action: "increment",
        timestamp: Math.floor(snap.createTime.toDate().getTime() / 1000),
      },
      {
        idempotencyKey: snap.id,
      },
    )

    const nextUsage = Number(user?.currentUsage || 0) + 1
    const userPlan = mapPlanIdToTier(user?.plan || "free")
    const usageCap = usageCapsByPlan[userPlan]
    const usageRatio = usageCap > 0 ? nextUsage / usageCap : 0
    const periodWindow = new Date().toISOString().slice(0, 7)

    for (const threshold of usageThresholds) {
      if (usageRatio >= threshold) {
        const percent = Math.round(threshold * 100)
        await emitUsageAlert({
          uid: userId,
          alertId: createAlertId(`usage_${percent}`, periodWindow),
          title: `Usage at ${percent}%`,
          message: `You have reached ${nextUsage}/${usageCap} included units for your ${userPlan} plan.`,
          severity: threshold >= 1 ? "error" : threshold >= 0.9 ? "warning" : "info",
          metadata: {
            currentUsage: nextUsage,
            includedUsage: usageCap,
            plan: userPlan,
            ratio: usageRatio,
          },
        })
      }
    }

    const billingRef = db.doc(`users/${userId}/billing/current`)
    const billingSnap = await billingRef.get()
    if (billingSnap.exists) {
      const billing = billingSnap.data() as UserBilling
      const creditBalance = getPurchasedCreditsAvailable(billing)

      if (creditBalance <= 20) {
        await emitUsageAlert({
          uid: userId,
          alertId: createAlertId("credits_low", periodWindow),
          title: "Credits running low",
          message: `Remaining credits: ${Math.max(0, creditBalance)}. Consider topping up to avoid interruptions.`,
          severity: creditBalance <= 5 ? "warning" : "info",
          metadata: { creditBalance },
        })
      }
    }

    return userRef.update({ currentUsage: nextUsage })
  })

export const grantPromotionalCredits = onCallv2(
  { secrets: stripeSecrets },
  async (req) => {
    const actorUid = req.auth?.uid
    if (!actorUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const actorSnap = await db.doc(`users/${actorUid}`).get()
    const actor = actorSnap.data() as Users | undefined
    if (actor?.role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can grant promotional credits")
    }

    const { targetUserId, credits, reason = "promotional_credit" } = req.data as {
      targetUserId: string
      credits: number
      reason?: string
    }

    if (!targetUserId || !Number.isFinite(credits) || credits <= 0) {
      throw new HttpsError("invalid-argument", "targetUserId and positive credits are required")
    }

    await addCreditsLedgerEntry({
      uid: targetUserId,
      delta: Math.floor(credits),
      source: "promotional_credit",
      bucket: "purchased",
      grantedBy: actorUid,
      reason,
    })

    return { ok: true, targetUserId, grantedCredits: Math.floor(credits) }
  },
)

export const expireTrialsToFree = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "UTC",
  },
  async () => {
    const nowIso = new Date().toISOString()
    const trialDocs = await db.collectionGroup("billing")
      .where("plan", "==", "trial")
      .get()

    let expiredCount = 0
    for (const trialDoc of trialDocs.docs) {
      const billing = trialDoc.data() as UserBilling
      if (!hasTrialExpired(billing)) {
        continue
      }

      const userRef = trialDoc.ref.parent.parent
      if (!userRef) {
        continue
      }

      await trialDoc.ref.set(buildFreePlanFromExpiredTrial(billing), { merge: true })
      await userRef.set({
        plan: "free",
        status: "inactive",
        subscriptionId: null,
        updated_At: new Date(),
      }, { merge: true })

      expiredCount += 1
    }

    console.log("expireTrialsToFree completed", { checkedAt: nowIso, expiredCount })
  },
)

