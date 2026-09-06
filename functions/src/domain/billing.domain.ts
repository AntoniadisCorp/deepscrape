/* eslint-disable max-len */
export type BillingPlanTier = "free" | "trial" | "starter" | "pro" | "enterprise"
export type BillingInterval = "payAsYouGo" | "monthly" | "quarterly" | "annually"
export type BillingAccessMode = "free" | "credits" | "plan" | "grace"
export type CreditBucket = "purchased" | "included"

export type BillingCredits = {
  balance?: number
  reserved?: number
  purchasedBalance?: number
  purchasedReserved?: number
  includedBalance?: number
  includedReserved?: number
}

export type BillingSnapshot = {
  plan?: string | BillingPlanTier | null
  subscriptionId?: string | null
  graceUntil?: string | null
  credits?: BillingCredits | null
}

const paidPlans = new Set<BillingPlanTier>(["trial", "starter", "pro", "enterprise"])

export const normalizeBillingPlan = (plan: string | BillingPlanTier | null | undefined): BillingPlanTier => {
  switch (plan) {
  case "trial":
  case "starter":
  case "pro":
  case "enterprise":
  case "free":
    return plan
  default:
    return "free"
  }
}

export const isPaidPlan = (plan: string | BillingPlanTier | null | undefined): boolean => {
  return paidPlans.has(normalizeBillingPlan(plan))
}

export const hasGraceAccess = (billing: BillingSnapshot | undefined, now = Date.now()): boolean => {
  return Boolean(billing?.graceUntil) && now < new Date(billing?.graceUntil as string).getTime()
}

export const getLegacyCreditBucket = (billing: BillingSnapshot | undefined): CreditBucket => {
  return normalizeBillingPlan(billing?.plan) === "free" ? "purchased" : "included"
}

export const getCreditAmounts = (
  billing: BillingSnapshot | undefined,
  bucket: CreditBucket,
): { balance: number; reserved: number } => {
  const credits = billing?.credits
  const legacyBalance = Number(credits?.balance || 0)
  const legacyReserved = Number(credits?.reserved || 0)

  if (bucket === "purchased") {
    if (credits?.purchasedBalance !== undefined || credits?.purchasedReserved !== undefined) {
      return {
        balance: Number(credits?.purchasedBalance || 0),
        reserved: Number(credits?.purchasedReserved || 0),
      }
    }

    return getLegacyCreditBucket(billing) === "purchased" ?
      {balance: legacyBalance, reserved: legacyReserved} :
      {balance: 0, reserved: 0}
  }

  if (credits?.includedBalance !== undefined || credits?.includedReserved !== undefined) {
    return {
      balance: Number(credits?.includedBalance || 0),
      reserved: Number(credits?.includedReserved || 0),
    }
  }

  return getLegacyCreditBucket(billing) === "included" ?
    {balance: legacyBalance, reserved: legacyReserved} :
    {balance: 0, reserved: 0}
}

export const getPurchasedCreditsAvailable = (billing: BillingSnapshot | undefined): number => {
  const credits = getCreditAmounts(billing, "purchased")
  return Math.max(0, credits.balance - credits.reserved)
}

export const getIncludedCreditsAvailable = (billing: BillingSnapshot | undefined): number => {
  const credits = getCreditAmounts(billing, "included")
  return Math.max(0, credits.balance - credits.reserved)
}

export const canPurchaseStandaloneCredits = (billing: BillingSnapshot | undefined): boolean => {
  return normalizeBillingPlan(billing?.plan) === "free" && !billing?.subscriptionId
}

export const getBillingAccessMode = (billing: BillingSnapshot | undefined, now = Date.now()): BillingAccessMode => {
  if (isPaidPlan(billing?.plan)) {
    return "plan"
  }

  if (normalizeBillingPlan(billing?.plan) === "free" && getPurchasedCreditsAvailable(billing) > 0) {
    return "credits"
  }

  if (hasGraceAccess(billing, now)) {
    return "grace"
  }

  return "free"
}

export const hasBillingAccess = (billing: BillingSnapshot | undefined, now = Date.now()): boolean => {
  return getBillingAccessMode(billing, now) !== "free"
}
