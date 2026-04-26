/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
import {onSchedule} from "firebase-functions/v2/scheduler"
import {onCall} from "firebase-functions/v2/https"
import {FieldValue} from "firebase-admin/firestore"
import {db} from "../app/config"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuestBreakdowns {
  byCountry: Record<string, number>
  byBrowser: Record<string, number>
  byDevice: Record<string, number>
  byOS: Record<string, number>
  byTimezone: Record<string, number>
  byLanguage: Record<string, number>
}

interface ConversionMetrics {
  registered: number
  unregistered: number
}

interface DailyMetrics {
  date: string
  totalGuests: number
  totalUsers: number
  totalLogins: number
  guestConversions: ConversionMetrics
  conversionRate: number
  breakdowns: GuestBreakdowns
  computedAt: string
  updatedAt: FieldValue
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortAndLimit(obj: Record<string, number>, limit: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit),
  )
}

function getDateRange(daysOffset: number): {start: string; end: string} {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() + daysOffset)

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

function getMonthRange(monthOffset: number): {start: string; end: string} {
  const date = new Date()
  date.setMonth(date.getMonth() + monthOffset)

  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

/**
 * Single pass through guests collection — aggregates all dimensions at once.
 * Called once per day so the full scan is intentional and cost-efficient
 * compared to repeated ad-hoc client reads.
 */
async function aggregateGuestBreakdowns(): Promise<GuestBreakdowns> {
  const snapshot = await db.collection("guests").get()

  const breakdowns: GuestBreakdowns = {
    byCountry: {},
    byBrowser: {},
    byDevice: {},
    byOS: {},
    byTimezone: {},
    byLanguage: {},
  }

  snapshot.docs.forEach((doc) => {
    const data = doc.data()

    const country = data["country"] || "Unknown"
    breakdowns.byCountry[country] = (breakdowns.byCountry[country] || 0) + 1

    const browser = data["browser"] || "Unknown"
    breakdowns.byBrowser[browser] = (breakdowns.byBrowser[browser] || 0) + 1

    const device = data["device"] || "Unknown"
    breakdowns.byDevice[device] = (breakdowns.byDevice[device] || 0) + 1

    const os = data["os"] || "Unknown"
    breakdowns.byOS[os] = (breakdowns.byOS[os] || 0) + 1

    const timezone = data["timezone"] || "Unknown"
    breakdowns.byTimezone[timezone] = (breakdowns.byTimezone[timezone] || 0) + 1

    const language = data["language"] || "Unknown"
    breakdowns.byLanguage[language] = (breakdowns.byLanguage[language] || 0) + 1
  })

  return {
    byCountry: sortAndLimit(breakdowns.byCountry, 20),
    byBrowser: sortAndLimit(breakdowns.byBrowser, 15),
    byDevice: sortAndLimit(breakdowns.byDevice, 10),
    byOS: sortAndLimit(breakdowns.byOS, 15),
    byTimezone: sortAndLimit(breakdowns.byTimezone, 20),
    byLanguage: sortAndLimit(breakdowns.byLanguage, 30),
  }
}

async function getConversionMetrics(): Promise<ConversionMetrics> {
  const snapshot = await db.collection("guests").get()
  let registered = 0
  let unregistered = 0

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (data["uid"] || data["linkedAt"]) {
      registered++
    } else {
      unregistered++
    }
  })

  return {registered, unregistered}
}

async function updateDashboardSummary(dailyMetrics: DailyMetrics): Promise<void> {
  const dashRef = db.collection("metrics_summary").doc("dashboard")
  await dashRef.set(
    {
      totalGuests: dailyMetrics.totalGuests,
      totalUsers: dailyMetrics.totalUsers,
      totalLogins: dailyMetrics.totalLogins,
      conversionRate: dailyMetrics.conversionRate,
      breakdowns: dailyMetrics.breakdowns,
      lastUpdated: dailyMetrics.computedAt,
      lastComputedAt: dailyMetrics.computedAt,
    },
    {merge: true},
  )
}

async function computeRangeMetrics(startDate: string, endDate: string) {
  const dailyDocs = await db
    .collection("metrics_daily")
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .get()

  if (dailyDocs.empty) {
    return {
      totalGuests: 0,
      totalUsers: 0,
      totalLogins: 0,
      guestConversions: {registered: 0, unregistered: 0},
      conversionRate: 0,
    }
  }

  let totalGuests = 0
  let totalUsers = 0
  let totalLogins = 0
  let registered = 0
  let unregistered = 0

  dailyDocs.forEach((doc) => {
    const data = doc.data()
    totalGuests += data["totalGuests"] || 0
    totalUsers += data["totalUsers"] || 0
    totalLogins += data["totalLogins"] || 0
    registered += data["guestConversions"]?.["registered"] || 0
    unregistered += data["guestConversions"]?.["unregistered"] || 0
  })

  return {
    totalGuests,
    totalUsers,
    totalLogins,
    guestConversions: {registered, unregistered},
    conversionRate: totalGuests > 0 ? (registered / totalGuests) * 100 : 0,
  }
}

async function updateRangeMetrics(): Promise<void> {
  const today = new Date().toISOString().split("T")[0]

  const ranges: Record<string, {start: string; end: string}> = {
    "last-7d": getDateRange(-7),
    "last-30d": getDateRange(-30),
    "last-90d": getDateRange(-90),
    "this-month": getMonthRange(0),
    "last-month": getMonthRange(-1),
  }

  await Promise.all(
    Object.entries(ranges).map(async ([rangeId, {start, end}]) => {
      const metrics = await computeRangeMetrics(start, end)
      await db
        .collection("metrics_range")
        .doc(rangeId)
        .set(
          {
            rangeId,
            startDate: start,
            endDate: end,
            computedAt: today,
            ...metrics,
          },
          {merge: true},
        )
    }),
  )
}

// ---------------------------------------------------------------------------
// Core aggregation logic — also used by the manual trigger callable below
// ---------------------------------------------------------------------------

async function runAggregation(): Promise<{date: string; totalGuests: number}> {
  const today = new Date().toISOString().split("T")[0]

  // Run guest scan and user/login counts concurrently
  const [guestsCountSnap, usersCountSnap, loginsCountSnap] = await Promise.all([
    db.collection("guests").count().get(),
    db.collection("users").count().get(),
    db.collectionGroup("login_history_events").count().get(),
  ])

  const [guestBreakdowns, guestConversions] = await Promise.all([
    aggregateGuestBreakdowns(),
    getConversionMetrics(),
  ])

  const totalGuests = guestsCountSnap.data().count
  const totalUsers = usersCountSnap.data().count
  const totalLogins = loginsCountSnap.data().count

  const conversionRate = totalGuests > 0 ? (guestConversions.registered / totalGuests) * 100 : 0

  const dailyMetrics: DailyMetrics = {
    date: today,
    totalGuests,
    totalUsers,
    totalLogins,
    guestConversions,
    conversionRate,
    breakdowns: guestBreakdowns,
    computedAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  // Write daily snapshot and update summary + range docs concurrently
  await Promise.all([
    db.collection("metrics_daily").doc(today).set(dailyMetrics, {merge: true}),
    updateDashboardSummary(dailyMetrics),
    updateRangeMetrics(),
  ])

  return {date: today, totalGuests}
}

// ---------------------------------------------------------------------------
// Scheduled function — runs every day at 01:00 UTC
// ---------------------------------------------------------------------------

/**
 * Aggregates the guests collection and pre-computes analytics summaries once
 * per day so the admin analytics dashboard can read a single Firestore doc
 * instead of scanning the entire guests collection on every load.
 *
 * Cost impact: replaces ~10 full-scan reads ($40/month) with a single
 * scheduled scan ($0.70/month) plus lightweight summary reads.
 */
export const aggregateDailyAnalytics = onSchedule(
  {
    schedule: "every day 01:00",
    timeZone: "UTC",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    try {
      console.log("🔄 Starting daily analytics aggregation…")
      const result = await runAggregation()
      console.log(`✅ Daily aggregation complete — ${result.totalGuests} guests aggregated for ${result.date}`)
    } catch (error) {
      console.error("❌ Daily aggregation failed:", error)
      throw error
    }
  },
)

// ---------------------------------------------------------------------------
// Manual trigger — callable by admins from the dashboard
// ---------------------------------------------------------------------------

/**
 * Callable version of the aggregation so admins can force a refresh from
 * the analytics dashboard without waiting for the nightly schedule.
 */
export const triggerAnalyticsAggregation = onCall(
  {invoker: "private"},
  async (request) => {
    // Only allow admin users
    if (!request.auth?.token?.["role"] || request.auth.token["role"] !== "admin") {
      throw new Error("Permission denied: admin role required")
    }

    try {
      console.log(`🔄 Manual aggregation triggered by admin ${request.auth.uid}`)
      const result = await runAggregation()
      console.log(`✅ Manual aggregation complete for ${result.date}`)
      return {success: true, date: result.date, totalGuests: result.totalGuests}
    } catch (error) {
      console.error("❌ Manual aggregation failed:", error)
      throw new Error("Aggregation failed — see Cloud Logging for details")
    }
  },
)
