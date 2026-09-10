/* eslint-disable max-len */
import {describe, it} from "node:test"
import assert from "node:assert/strict"
import {
  buildAnalyticsEvent,
  toEventDate,
  toFunnelCounterKeys,
  toPaidCounterKeys,
} from "./analytics-event.domain"

describe("analytics events", () => {
  it("stamps the UTC day key and defaults missing context", () => {
    const event = buildAnalyticsEvent({
      name: "guest_created",
      ts: new Date("2026-01-02T23:30:00.000Z"),
    })

    assert.equal(event.date, "2026-01-02")
    assert.equal(event.uid, "")
    assert.equal(event.guestId, null)
    assert.equal(event.isBot, false)
    assert.equal(event.botKind, null)
    assert.deepEqual(event.props, {})
  })

  it("derives the day key in UTC, not local time", () => {
    assert.equal(toEventDate(new Date("2026-03-01T00:00:00.000Z")), "2026-03-01")
    assert.equal(toEventDate(new Date("2026-03-01T23:59:59.999Z")), "2026-03-01")
  })

  it("keeps bots out of the funnel but counts them by kind", () => {
    const bots = buildAnalyticsEvent({
      name: "guest_created",
      isBot: true,
      botKind: "ai-crawler",
    })
    const humans = buildAnalyticsEvent({name: "guest_created"})

    assert.deepEqual(toFunnelCounterKeys(bots), ["bots", "byBotKind.ai-crawler"])
    assert.deepEqual(toFunnelCounterKeys(humans), ["funnel.guest_created"])
  })

  it("falls back to a generic bot kind when the parser has none", () => {
    assert.deepEqual(
      toFunnelCounterKeys({name: "guest_created", isBot: true, botKind: null}),
      ["bots", "byBotKind.bot"],
    )
  })
})

describe("paid counters", () => {
  it("keeps amounts currency-scoped and flattens path-like channel values", () => {
    assert.deepEqual(
      toPaidCounterKeys({amountMinor: 4900, currency: "eur", plan: "pro", channel: "google.com"}),
      [
        ["revenueByCurrency.EUR", 4900],
        ["paymentsByCurrency.EUR", 1],
        ["paidByPlan.pro", 1],
        ["paidByChannel.google_com", 1],
      ],
    )
  })

  it("counts a payment that carries no plan or channel", () => {
    assert.deepEqual(toPaidCounterKeys({amountMinor: 1000, currency: "usd"}), [
      ["revenueByCurrency.USD", 1000],
      ["paymentsByCurrency.USD", 1],
    ])
  })

  it("rounds fractional amounts to whole minor units", () => {
    assert.equal(toPaidCounterKeys({amountMinor: 1234.6, currency: "eur"})[0][1], 1235)
  })
})
