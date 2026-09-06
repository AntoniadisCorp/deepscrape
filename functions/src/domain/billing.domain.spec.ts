/* eslint-disable max-len */
import {describe, it} from "node:test"
import assert from "node:assert/strict"
import {
  canPurchaseStandaloneCredits,
  getBillingAccessMode,
  getIncludedCreditsAvailable,
  getPurchasedCreditsAvailable,
  hasBillingAccess,
  isPaidPlan,
  normalizeBillingPlan,
} from "./billing.domain"

describe("billing.domain", () => {
  it("normalizeBillingPlan falls back unknown plans to free", () => {
    assert.equal(normalizeBillingPlan("starter"), "starter")
    assert.equal(normalizeBillingPlan("garbage"), "free")
    assert.equal(normalizeBillingPlan(null), "free")
    assert.equal(normalizeBillingPlan(undefined), "free")
  })

  it("isPaidPlan is true only for paid tiers", () => {
    assert.equal(isPaidPlan("trial"), true)
    assert.equal(isPaidPlan("starter"), true)
    assert.equal(isPaidPlan("enterprise"), true)
    assert.equal(isPaidPlan("free"), false)
    assert.equal(isPaidPlan("unknown"), false)
  })

  it("derives purchased and included credits from dedicated fields", () => {
    const billing = {
      plan: "free",
      credits: {
        purchasedBalance: 120,
        purchasedReserved: 20,
        includedBalance: 35,
        includedReserved: 5,
      },
    }

    assert.equal(getPurchasedCreditsAvailable(billing), 100)
    assert.equal(getIncludedCreditsAvailable(billing), 30)
  })

  it("supports legacy credit fields for free and paid plans", () => {
    const legacyFree = {
      plan: "free",
      credits: {
        balance: 30,
        reserved: 5,
      },
    }
    const legacyPaid = {
      plan: "pro",
      credits: {
        balance: 40,
        reserved: 10,
      },
    }

    assert.equal(getPurchasedCreditsAvailable(legacyFree), 25)
    assert.equal(getIncludedCreditsAvailable(legacyFree), 0)
    assert.equal(getPurchasedCreditsAvailable(legacyPaid), 0)
    assert.equal(getIncludedCreditsAvailable(legacyPaid), 30)
  })

  it("returns access mode by priority: plan > credits > grace > free", () => {
    const now = Date.UTC(2026, 2, 19)

    assert.equal(getBillingAccessMode({plan: "pro"}, now), "plan")
    assert.equal(
      getBillingAccessMode({plan: "free", credits: {purchasedBalance: 10}}, now),
      "credits",
    )
    assert.equal(
      getBillingAccessMode({plan: "free", graceUntil: "2099-01-01T00:00:00.000Z"}, now),
      "grace",
    )
    assert.equal(getBillingAccessMode({plan: "free"}, now), "free")
  })

  it("hasBillingAccess is false only for free mode", () => {
    const now = Date.UTC(2026, 2, 19)

    assert.equal(hasBillingAccess({plan: "starter"}, now), true)
    assert.equal(hasBillingAccess({plan: "free", credits: {purchasedBalance: 2}}, now), true)
    assert.equal(hasBillingAccess({plan: "free"}, now), false)
  })

  it("canPurchaseStandaloneCredits requires free plan without subscription", () => {
    assert.equal(canPurchaseStandaloneCredits({plan: "free"}), true)
    assert.equal(canPurchaseStandaloneCredits({plan: "free", subscriptionId: "sub_123"}), false)
    assert.equal(canPurchaseStandaloneCredits({plan: "pro"}), false)
  })
})
