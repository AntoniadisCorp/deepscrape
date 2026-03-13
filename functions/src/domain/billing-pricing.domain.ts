/* eslint-disable max-len */
import {env} from "../config"

export type BillingPricedMethod = "GET" | "POST" | "PUT" | "DELETE"

export type BillingPricingPolicy = {
  action: string
  credits: number
}

export type BillingPricingRule = {
  method: BillingPricedMethod
  pattern: string
  policy: BillingPricingPolicy
}

const defaultPricingRules: BillingPricingRule[] = [
  {method: "POST", pattern: "^/anthropic/messages$", policy: {action: "ai.anthropic.messages", credits: 2}},
  {method: "POST", pattern: "^/openai/chat/completions$", policy: {action: "ai.openai.chat", credits: 2}},
  {method: "POST", pattern: "^/groq/chat/completions$", policy: {action: "ai.groq.chat", credits: 1}},
  {method: "POST", pattern: "^/crawl$", policy: {action: "crawl.execute", credits: 3}},
  {method: "POST", pattern: "^/machines/deploy$", policy: {action: "machines.deploy", credits: 5}},
  {method: "GET", pattern: "^/machines/machine/[^/]+$", policy: {action: "machines.read", credits: 1}},
  {method: "GET", pattern: "^/machines/check-image$", policy: {action: "machines.check_image", credits: 1}},
  {method: "GET", pattern: "^/machines/machine/waitforstate/[^/]+$", policy: {action: "machines.wait_for_state", credits: 1}},
  {method: "PUT", pattern: "^/machines/machine/[^/]+/start$", policy: {action: "machines.start", credits: 1}},
  {method: "PUT", pattern: "^/machines/machine/[^/]+/suspend$", policy: {action: "machines.suspend", credits: 1}},
  {method: "PUT", pattern: "^/machines/machine/[^/]+/stop$", policy: {action: "machines.stop", credits: 1}},
  {method: "DELETE", pattern: "^/machines/machine/[^/]+$", policy: {action: "machines.destroy", credits: 2}},
]

const defaultPricingPolicy: BillingPricingPolicy = {
  action: "api.paid.default",
  credits: 1,
}

const validMethods = new Set<BillingPricedMethod>(["GET", "POST", "PUT", "DELETE"])

const normalizeCredits = (value: unknown): number | null => {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

const sanitizeRule = (raw: unknown): BillingPricingRule | null => {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const candidate = raw as {
    method?: unknown
    pattern?: unknown
    policy?: {
      action?: unknown
      credits?: unknown
    }
  }

  const method = typeof candidate.method === "string" ? candidate.method.toUpperCase() : ""
  if (!validMethods.has(method as BillingPricedMethod)) {
    return null
  }

  const pattern = typeof candidate.pattern === "string" ? candidate.pattern.trim() : ""
  if (!pattern) {
    return null
  }

  try {
    // Validate regex once at startup.
    new RegExp(pattern)
  } catch {
    return null
  }

  const action = typeof candidate.policy?.action === "string" ? candidate.policy.action.trim() : ""
  const credits = normalizeCredits(candidate.policy?.credits)
  if (!action || credits === null) {
    return null
  }

  return {
    method: method as BillingPricedMethod,
    pattern,
    policy: {
      action,
      credits,
    },
  }
}

const parseRulesFromEnv = (): BillingPricingRule[] | null => {
  const raw = (env.BILLING_PRICING_RULES_JSON || "").trim()
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return null
    }

    const rules = parsed
      .map((entry) => sanitizeRule(entry))
      .filter((entry): entry is BillingPricingRule => Boolean(entry))

    return rules.length ? rules : null
  } catch {
    return null
  }
}

const activeRules: BillingPricingRule[] = parseRulesFromEnv() || defaultPricingRules

export const resolveBillingPricingPolicy = (
  method: string,
  routePath: string,
): BillingPricingPolicy => {
  const normalizedMethod = method.toUpperCase()
  const path = routePath || ""

  const matched = activeRules.find((rule) => {
    if (rule.method !== normalizedMethod) {
      return false
    }

    return new RegExp(rule.pattern).test(path)
  })

  return matched?.policy || defaultPricingPolicy
}

export const getBillingPricingRules = (): BillingPricingRule[] => {
  return activeRules
}
