/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */

import { onDocumentCreated } from "firebase-functions/v2/firestore"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { FieldValue, Timestamp } from "firebase-admin/firestore"


import { Guest, loginHistoryInfo, MetricsDaily, Users } from "../domain"
import { db } from "../app/config"

const mapToTop = (source: Record<string, number> | undefined, key: string, limit = 10) => {
  if (!source) return [] as Array<Record<string, unknown>>
  return Object.entries(source)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, limit)
    .map(([name, count]) => ({ [key]: name, count }))
}

// ============================================================================
// REAL-TIME TRIGGERS - Atomic Updates for Live Dashboard
// ============================================================================

/**
 * 🔥 CRITICAL: This trigger updates analytics in real-time when guests are created
 * Updates: metrics_daily, metrics_hourly, metrics_summary/dashboard
 */
export const onGuestCreated = onDocumentCreated("guests/{guestId}", async (event) => {
  const guest = event.data?.data() as Guest
  if (!guest) return

  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const hour = now.getHours()
  const hourKey = `${today}-${hour.toString().padStart(2, "0")}`

  try {
    // Single batch transaction for consistency
    const batch = db.batch()

    // 1. Update daily metrics
    const dailyRef = db.doc(`metrics_daily/${today}`)
    batch.set(dailyRef, {
      date: today,
      timestamp: Timestamp.now(),
      newGuests: FieldValue.increment(1),
      totalGuests: FieldValue.increment(1),
      activeGuests: FieldValue.increment(1),
      [`byCountry.${guest.country}`]: FieldValue.increment(1),
      [`byBrowser.${guest.browser}`]: FieldValue.increment(1),
      [`byDevice.${guest.device}`]: FieldValue.increment(1),
      [`byOS.${guest.os}`]: FieldValue.increment(1),
      [`byTimezone.${guest.timezone}`]: FieldValue.increment(1),
      [`guestsByHour.${hour}`]: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    }, { merge: true })

    // 2. Update hourly metrics
    const hourlyRef = db.doc(`metrics_hourly/${hourKey}`)
    batch.set(hourlyRef, {
      datetime: hourKey,
      date: today,
      hour: hour,
      timestamp: Timestamp.now(),
      newGuests: FieldValue.increment(1),
      activeGuests: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    }, { merge: true })

    // 3. Update dashboard summary (for real-time UI)
    const summaryRef = db.doc("metrics_summary/dashboard")
    batch.set(summaryRef, {
      totalGuests: FieldValue.increment(1),
      activeGuests: FieldValue.increment(1),
      lastUpdated: Timestamp.now(),
      computedAt: Timestamp.now(),
    }, { merge: true })

    await batch.commit()
    console.log(`✅ Guest ${event.params.guestId} metrics updated successfully`)
  } catch (error) {
    console.error(`❌ Error updating guest metrics for ${event.params.guestId}:`, error)
    // Don't throw - let the guest creation succeed even if analytics fail
  }
})

/**
 * 🔥 User registration trigger - Updates user metrics and conversion tracking
 */
export const onUserRegistered = onDocumentCreated("users/{userId}", async (event) => {
  const user = event.data?.data() as Users
  if (!user) return

  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const hour = now.getHours()

  try {
    const batch = db.batch()

    // Check if this was a guest conversion
    const guestId = user.loginMetricsId // Assuming this links to guest
    let isConversion = false

    if (guestId) {
      // Check if guest exists and update linkedAt
      const guestRef = db.doc(`guests/${guestId}`)
      const guestDoc = await guestRef.get()

      if (guestDoc.exists && !guestDoc.data()?.linkedAt) {
        batch.update(guestRef, {
          linkedAt: Timestamp.now(),
          uid: user.uid,
        })
        isConversion = true
      }
    }

    // 1. Update daily metrics
    const dailyRef = db.doc(`metrics_daily/${today}`)
    const dailyUpdate: Record<string, FieldValue | Timestamp> = {
      newUsers: FieldValue.increment(1),
      totalUsers: FieldValue.increment(1),
      activeUsers: FieldValue.increment(1),
      [`usersByHour.${hour}`]: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    }

    if (isConversion) {
      dailyUpdate.guestConversions = FieldValue.increment(1)
    }

    batch.set(dailyRef, dailyUpdate, { merge: true })

    // 2. Update dashboard summary
    const summaryRef = db.doc("metrics_summary/dashboard")
    const summaryUpdate: Record<string, FieldValue | Timestamp> = {
      totalUsers: FieldValue.increment(1),
      activeUsers: FieldValue.increment(1),
      lastUpdated: Timestamp.now(),
      computedAt: Timestamp.now(),
    }

    if (isConversion) {
      summaryUpdate.guestConversions = FieldValue.increment(1)
    }

    batch.set(summaryRef, summaryUpdate, { merge: true })

    // 3. Initialize user login metrics
    const userMetricsRef = db.doc(`users/${user.uid}/login_metrics`)
    batch.set(userMetricsRef, {
      userId: user.uid,
      totalLogins: 0,
      loginStreak: 0,
      longestStreak: 0,
      firstLogin: null,
      lastLogin: null,
      wasGuest: isConversion,
      guestId: isConversion ? guestId : null,
      linkedAt: isConversion ? Timestamp.now() : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    await batch.commit()
    console.log(`✅ User ${user.uid} registration metrics updated (conversion: ${isConversion})`)
  } catch (error) {
    console.error(`❌ Error updating user registration metrics for ${event.params.userId}:`, error)
  }
})

/**
 * 🔥 Login event trigger - Updates login analytics and user metrics
 */
export const onLoginEvent = onDocumentCreated("users/{userId}/login_history/{loginId}", async (event) => {
  const loginInfo = event.data?.data() as loginHistoryInfo
  if (!loginInfo) return

  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const hour = now.getHours()

  try {
    const batch = db.batch()

    // 1. Update daily metrics
    const dailyRef = db.doc(`metrics_daily/${today}`)
    batch.set(dailyRef, {
      totalLogins: FieldValue.increment(1),
      [`loginsByHour.${hour}`]: FieldValue.increment(1),
      [`byProvider.${loginInfo.providerId}`]: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    }, { merge: true })

    // 2. Update hourly metrics
    const hourKey = `${today}-${hour.toString().padStart(2, "0")}`
    const hourlyRef = db.doc(`metrics_hourly/${hourKey}`)
    batch.set(hourlyRef, {
      totalLogins: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    }, { merge: true })

    // 3. Update dashboard summary
    const summaryRef = db.doc("metrics_summary/dashboard")
    batch.set(summaryRef, {
      totalLogins: FieldValue.increment(1),
      lastUpdated: Timestamp.now(),
    }, { merge: true })

    // 4. Update user login metrics
    const userMetricsRef = db.doc(`users/${loginInfo.uid}/login_metrics`)
    batch.set(userMetricsRef, {
      totalLogins: FieldValue.increment(1),
      lastLogin: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true })

    await batch.commit()
    console.log(`✅ Login metrics updated for user ${loginInfo.uid}`)
  } catch (error) {
    console.error("❌ Error updating login metrics:", error)
  }
})

// ============================================================================
// BACKFILL - Ensure dashboard summary exists even without new events
// ============================================================================

/**
 * 🧹 Backfill dashboard summary from existing metrics
 * Runs every 30 minutes to ensure metrics_summary/dashboard exists
 */
export const backfillDashboardSummary = onSchedule("*/30 * * * *", async () => {
  try {
    const latestDailySnap = await db.collection("metrics_daily")
      .orderBy("date", "desc")
      .limit(1)
      .get()

    const latestDaily = latestDailySnap.docs[0]?.data() as MetricsDaily | undefined

    const rangeSnap = await db.doc("metrics_range/last-30d").get()
    const rangeData = rangeSnap.exists ? rangeSnap.data() as any : null

    const totalGuests = latestDaily?.totalGuests || 0
    const totalUsers = latestDaily?.totalUsers || 0
    const totalLogins = latestDaily?.totalLogins || 0
    const guestConversions = latestDaily?.guestConversions || 0
    const conversionRate = totalGuests > 0
      ? Math.round((guestConversions / totalGuests) * 100)
      : 0

    const summaryRef = db.doc("metrics_summary/dashboard")
    await summaryRef.set({
      totalGuests: totalGuests,
      activeGuests: latestDaily?.activeGuests || 0,
      totalUsers: totalUsers,
      activeUsers: latestDaily?.activeUsers || 0,
      totalLogins: totalLogins,
      guestConversions: guestConversions,
      conversionRate: conversionRate,
      topCountries: mapToTop(rangeData?.byCountry || latestDaily?.byCountry, "country"),
      topBrowsers: mapToTop(rangeData?.byBrowser || latestDaily?.byBrowser, "browser"),
      topDevices: mapToTop(rangeData?.byDevice || latestDaily?.byDevice, "device"),
      topProviders: mapToTop(rangeData?.byProvider || latestDaily?.byProvider, "provider"),
      lastUpdated: Timestamp.now(),
      computedAt: Timestamp.now(),
    }, { merge: true })

    console.log("✅ Backfill dashboard summary completed")
  } catch (error) {
    console.error("❌ Backfill dashboard summary failed:", error)
  }
})

// ============================================================================
// SCHEDULED FUNCTIONS - Compute Aggregations & Trends
// ============================================================================

/**
 * 📊 Daily aggregation - Computes trends and optimizes daily metrics
 * Runs every day at 00:05 UTC
 */
export const computeDailyTrends = onSchedule("5 0 * * *", async () => {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const todayStr = today.toISOString().split("T")[0]
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  try {
    // Get yesterday's and today's metrics
    const [yesterdayDoc, todayDoc] = await Promise.all([
      db.doc(`metrics_daily/${yesterdayStr}`).get(),
      db.doc(`metrics_daily/${todayStr}`).get(),
    ])

    const yesterdayData = yesterdayDoc.data() as MetricsDaily | undefined
    const todayData = todayDoc.data() as MetricsDaily | undefined

    if (!yesterdayData || !todayData) {
      console.warn("Missing data for trend calculation")
      return
    }

    // Calculate trends (% change from yesterday)
    const calculateGrowth = (today: number, yesterday: number): number => {
      if (yesterday === 0) return today > 0 ? 100 : 0
      return Math.round(((today - yesterday) / yesterday) * 100)
    }

    const trends = {
      guestsGrowth: calculateGrowth(todayData.newGuests, yesterdayData.newGuests),
      usersGrowth: calculateGrowth(todayData.newUsers, yesterdayData.newUsers),
      loginsGrowth: calculateGrowth(todayData.totalLogins, yesterdayData.totalLogins),
      conversionGrowth: calculateGrowth(todayData.conversionRate || 0, yesterdayData.conversionRate || 0),
    }

    // Update dashboard summary with trends
    await db.doc("metrics_summary/dashboard").update({
      trends: trends,
      computedAt: Timestamp.now(),
    })

    console.log(`✅ Daily trends computed: ${JSON.stringify(trends)}`)
  } catch (error) {
    console.error("❌ Error computing daily trends:", error)
  }
})

/**
 * 📈 Range metrics computation - Pre-computes common date ranges
 * Runs every day at 01:00 UTC
 */
export const computeRangeMetrics = onSchedule("0 1 * * *", async () => {
  const ranges = [
    { id: "last-7d", days: 7 },
    { id: "last-30d", days: 30 },
    { id: "last-90d", days: 90 },
  ]

  try {
    for (const range of ranges) {
      await computeRangeMetric(range.id, range.days)
    }
    console.log("✅ All range metrics computed successfully")
  } catch (error) {
    console.error("❌ Error computing range metrics:", error)
  }
})

async function computeRangeMetric(rangeId: string, days: number) {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

  // Generate array of dates
  const dates: string[] = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0])
  }

  // Fetch all daily metrics for the range
  const dailyMetricsPromises = dates.map((date) =>
    db.doc(`metrics_daily/${date}`).get()
  )
  const dailySnapshots = await Promise.all(dailyMetricsPromises)

  // Aggregate the data
  let totalGuests = 0
  let newGuests = 0
  let totalUsers = 0
  let newUsers = 0
  let totalLogins = 0
  let guestConversions = 0
  const byCountry: { [key: string]: number } = {}
  const byBrowser: { [key: string]: number } = {}
  const byDevice: { [key: string]: number } = {}
  const byProvider: { [key: string]: number } = {}
  const dailyBreakdown: Array<{
    date: string
    newGuests: number
    newUsers: number
    totalLogins: number
    guestConversions: number
    conversionRate: number
  }> = []

  dailySnapshots.forEach((snapshot, index) => {
    const data = snapshot.data() as MetricsDaily | undefined
    const date = dates[index]

    if (data) {
      totalGuests += data.totalGuests || 0
      newGuests += data.newGuests || 0
      totalUsers += data.totalUsers || 0
      newUsers += data.newUsers || 0
      totalLogins += data.totalLogins || 0
      guestConversions += data.guestConversions || 0

      // Aggregate dimensions
      Object.entries(data.byCountry || {}).forEach(([country, count]) => {
        byCountry[country] = (byCountry[country] || 0) + count
      })

      Object.entries(data.byBrowser || {}).forEach(([browser, count]) => {
        byBrowser[browser] = (byBrowser[browser] || 0) + count
      })

      Object.entries(data.byDevice || {}).forEach(([device, count]) => {
        byDevice[device] = (byDevice[device] || 0) + count
      })

      Object.entries(data.byProvider || {}).forEach(([provider, count]) => {
        byProvider[provider] = (byProvider[provider] || 0) + count
      })

      dailyBreakdown.push({
        date: date,
        newGuests: data.newGuests || 0,
        newUsers: data.newUsers || 0,
        totalLogins: data.totalLogins || 0,
        guestConversions: data.guestConversions || 0,
        conversionRate: data.conversionRate || 0,
      })
    } else {
      // Fill missing days with zeros
      dailyBreakdown.push({
        date: date,
        newGuests: 0,
        newUsers: 0,
        totalLogins: 0,
        guestConversions: 0,
        conversionRate: 0,
      })
    }
  })

  // Calculate averages and trends
  const avgDailyGuests = Math.round(newGuests / days)
  const avgDailyUsers = Math.round(newUsers / days)
  const avgDailyLogins = Math.round(totalLogins / days)

  // Find peak day
  const peakDay = dailyBreakdown.reduce((peak, current) =>
    current.totalLogins > peak.totalLogins ? current : peak
  )

  // Store the computed range metrics
  await db.doc(`metrics_range/${rangeId}`).set({
    rangeId: rangeId,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    totalGuests: totalGuests,
    newGuests: newGuests,
    totalUsers: totalUsers,
    newUsers: newUsers,
    totalLogins: totalLogins,
    guestConversions: guestConversions,
    conversionRate: newGuests > 0 ? Math.round((guestConversions / newGuests) * 100) : 0,
    byCountry: byCountry,
    byBrowser: byBrowser,
    byDevice: byDevice,
    byProvider: byProvider,
    dailyBreakdown: dailyBreakdown,
    trends: {
      avgDailyGuests: avgDailyGuests,
      avgDailyUsers: avgDailyUsers,
      avgDailyLogins: avgDailyLogins,
      peakDay: peakDay.date,
      peakValue: peakDay.totalLogins,
    },
    computedAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24h TTL
  })

  console.log(`✅ Range metric ${rangeId} computed successfully`)
}

/**
 * 🧹 Cleanup old analytics data
 * Runs daily at 02:00 UTC
 */
export const cleanupOldAnalytics = onSchedule("0 2 * * *", async () => {
  try {
    // Clean up old hourly metrics (keep only 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const hourlycutoff = sevenDaysAgo.toISOString().split("T")[0]

    // Query and delete old hourly metrics
    const oldHourlyQuery = await db.collection("metrics_hourly")
      .where("date", "<=", hourlycutoff)
      .limit(100)
      .get()

    if (!oldHourlyQuery.empty) {
      const batch = db.batch()
      oldHourlyQuery.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
      console.log(`🧹 Cleaned up ${oldHourlyQuery.size} old hourly metrics`)
    }

    // Clean up expired range metrics
    const expiredRangeQuery = await db.collection("metrics_range")
      .where("expiresAt", "<=", Timestamp.now())
      .get()

    if (!expiredRangeQuery.empty) {
      const batch = db.batch()
      expiredRangeQuery.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
      console.log(`🧹 Cleaned up ${expiredRangeQuery.size} expired range metrics`)
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
  }
})
