import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  filterByDimensions,
  getTopN,
  periodToDateRange,
} from "./analytics-helpers"

describe("analytics-helpers", () => {
  it("periodToDateRange returns same day for today and yesterday shapes", () => {
    const today = periodToDateRange("today")
    const yesterday = periodToDateRange("yesterday")

    assert.match(today.startDate, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(today.startDate, today.endDate)
    assert.match(yesterday.startDate, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(yesterday.startDate, yesterday.endDate)
  })

  it("periodToDateRange falls back safely for unknown period", () => {
    const fallback = periodToDateRange("not-a-period")
    assert.match(fallback.startDate, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(fallback.startDate, fallback.endDate)
  })

  it("filterByDimensions applies country and browser filters", () => {
    const input = [{
      date: "2026-03-19",
      byCountry: { GR: 5, US: 4 },
      byBrowser: { Chrome: 8, Firefox: 1 },
      byDevice: { Mobile: 3, Windows: 6 },
      byProvider: { "google.com": 7, password: 2 },
    }]

    const filtered = filterByDimensions(input as never, {
      country: ["GR"],
      browser: "Chrome",
    }) as Array<{
      byCountry: Record<string, number>
      byBrowser: Record<string, number>
    }>

    assert.deepEqual(filtered[0].byCountry, { GR: 5 })
    assert.deepEqual(filtered[0].byBrowser, { Chrome: 8 })
  })

  it("filterByDimensions maps provider and device aliases", () => {
    const input = [{
      date: "2026-03-19",
      byCountry: { GR: 5 },
      byBrowser: { Chrome: 8 },
      byDevice: { Mobile: 3, iPhone: 2, Windows: 6 },
      byProvider: { "google.com": 7, password: 2 },
    }]

    const providerFiltered = filterByDimensions(input as never, {
      provider: "google",
    }) as Array<{ byProvider: Record<string, number> }>

    const deviceFiltered = filterByDimensions(input as never, {
      device: "mobile",
    }) as Array<{ byDevice: Record<string, number> }>

    assert.deepEqual(providerFiltered[0].byProvider, { "google.com": 7 })
    assert.deepEqual(deviceFiltered[0].byDevice, { Mobile: 3, iPhone: 2 })
  })

  it("getTopN sorts descending and limits entries", () => {
    const result = getTopN({ A: 10, C: 3, B: 7 }, 2)

    assert.deepEqual(result, [
      { key: "A", value: 10 },
      { key: "B", value: 7 },
    ])
  })
})
