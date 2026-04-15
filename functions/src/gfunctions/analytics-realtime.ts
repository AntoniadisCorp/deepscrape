/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */

import { onDocumentCreated } from "firebase-functions/v2/firestore"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { FieldValue, Timestamp } from "firebase-admin/firestore"


import { Guest, loginHistoryInfo, MetricsDaily, Users } from "../domain"
import { db, dbName } from "../app/config"

// ⭐ CRITICAL: Specify named database for v2 triggers
const DATABASE_NAME = dbName || "easyscrape"

const mapToTop = (source: Record<string, number> | undefined, key: string, limit = 10) => {
  if (!source) return [] as Array<Record<string, unknown>>
  return Object.entries(source)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, limit)
    .map(([name, count]) => ({ [key]: name, count }))
}

const toLatitudeBand = (latitude?: number) => {
  if (!Number.isFinite(latitude)) return "Unknown"
  const lat = Number(latitude)
  return `${Math.floor(lat)}..${Math.floor(lat) + 1}`
}

const toLongitudeBand = (longitude?: number) => {
  if (!Number.isFinite(longitude)) return "Unknown"
  const lng = Number(longitude)
  return `${Math.floor(lng)}..${Math.floor(lng) + 1}`
}

type RangeSummary = {
  byCountry?: Record<string, number>
  byBrowser?: Record<string, number>
  byDevice?: Record<string, number>
  byOS?: Record<string, number>
  byProvider?: Record<string, number>
  byTimezone?: Record<string, number>
}

type MetricsDailyExtended = MetricsDaily & {
  byRegion?: Record<string, number>
  byLocation?: Record<string, number>
  byGeoCell?: Record<string, number>
  byLatitudeBand?: Record<string, number>
  byLongitudeBand?: Record<string, number>
}

// ============================================================================
// REAL-TIME TRIGGERS - Atomic Updates for Live Dashboard
// ============================================================================

/**
 * 🔥 CRITICAL: This trigger updates analytics in real-time when guests are created
 * Updates: metrics_daily, metrics_hourly, metrics_summary/dashboard
 */
export const onGuestCreated = onDocumentCreated(
  {
    document: "guests/{guestId}",
    database: DATABASE_NAME, // ⭐ v2 requires database parameter for named databases
  },
  async (event) => {
    const guest = event.data?.data() as Guest
    if (!guest) return

    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const hour = now.getHours()
    const hourKey = `${today}-${hour.toString().padStart(2, "0")}`
    const geoCell =
      Number.isFinite(guest.latitude) && Number.isFinite(guest.longitude) ?
        `${Number(guest.latitude).toFixed(1)},${Number(guest.longitude).toFixed(1)}` :
        "Unknown"
    const latBand = toLatitudeBand(guest.latitude)
    const lonBand = toLongitudeBand(guest.longitude)

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
        [`byRegion.${guest.region || "Unknown"}`]: FieldValue.increment(1),
        [`byLocation.${guest.location || "Unknown"}`]: FieldValue.increment(1),
        [`byGeoCell.${geoCell}`]: FieldValue.increment(1),
        [`byLatitudeBand.${latBand}`]: FieldValue.increment(1),
        [`byLongitudeBand.${lonBand}`]: FieldValue.increment(1),
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
        [`byOS.${guest.os || "Unknown"}`]: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      }, { merge: true })

      // 3. Update dashboard summary (for real-time UI)
      const summaryRef = db.doc("metrics_summary/dashboard")
      batch.set(summaryRef, {
        totalGuests: FieldValue.increment(1),
        activeGuests: FieldValue.increment(1),
        [`byCountry.${guest.country || "Unknown"}`]: FieldValue.increment(1),
        [`byBrowser.${guest.browser || "Unknown"}`]: FieldValue.increment(1),
        [`byDevice.${guest.device || "Unknown"}`]: FieldValue.increment(1),
        [`byOS.${guest.os || "Unknown"}`]: FieldValue.increment(1),
        [`byTimezone.${guest.timezone || "Unknown"}`]: FieldValue.increment(1),
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
export const onUserRegistered = onDocumentCreated(
  {
    document: "users/{userId}",
    database: DATABASE_NAME, // ⭐ v2 requires database parameter for named databases
  },
  async (event) => {
    const user = event.data?.data() as Users
    if (!user) return
    const userId = event.params.userId

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
            uid: userId,
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
      const userMetricsRef = db.doc(`users/${userId}/login_metrics/summary`)
      batch.set(userMetricsRef, {
        userId: userId,
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
      console.log(`✅ User ${userId} registration metrics updated (conversion: ${isConversion})`)
    } catch (error) {
      console.error(`❌ Error updating user registration metrics for ${event.params.userId}:`, error)
    }
  })

/**
 * 🔥 Login event trigger - Updates login analytics and user metrics
 */
export const onLoginEvent = onDocumentCreated(
  {
    document: "login_metrics/{userId}/login_history_Info/{loginId}",
    database: DATABASE_NAME, // ⭐ v2 requires database parameter for named databases
  },
  async (event) => {
    const loginInfo = event.data?.data() as loginHistoryInfo
    if (!loginInfo) return

    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const hour = now.getHours()

    try {
      const batch = db.batch()

      // 1. Update daily metrics
      const dailyRef = db.doc(`metrics_daily/${today}`)
      const providerKey = loginInfo.providerId || "unknown"
      batch.set(dailyRef, {
        totalLogins: FieldValue.increment(1),
        [`loginsByHour.${hour}`]: FieldValue.increment(1),
        [`byProvider.${providerKey}`]: FieldValue.increment(1),
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
        [`byProvider.${providerKey}`]: FieldValue.increment(1),
        lastUpdated: Timestamp.now(),
      }, { merge: true })

      // 4. Update user login metrics
      const userMetricsRef = db.doc(`users/${event.params.userId}/login_metrics/summary`)
      batch.set(userMetricsRef, {
        totalLogins: FieldValue.increment(1),
        lastLogin: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true })

      await batch.commit()
      console.log(`✅ Login metrics updated for user ${event.params.userId}`)
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
    const now = new Date()
    const last30Start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0]
    const last30StartTs = Timestamp.fromDate(new Date(`${last30Start}T00:00:00.000Z`))
    const tomorrowTs = Timestamp.fromDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))

    const [latestDailySnap, rangeSnap, guestCountSnap, userCountSnap, last30DailySnap, last30LoginCount] = await Promise.all([
      db.collection("metrics_daily")
        .orderBy("date", "desc")
        .limit(1)
        .get(),
      db.doc("metrics_range/last-30d").get(),
      db.collection("guests").count().get(),
      db.collection("users").count().get(),
      db.collection("metrics_daily")
        .where("date", ">=", last30Start)
        .get(),
      db.collectionGroup("login_history_Info")
        .where("timestamp", ">=", last30StartTs)
        .where("timestamp", "<", tomorrowTs)
        .count()
        .get(),
    ])

    const latestDaily = latestDailySnap.docs[0]?.data() as MetricsDaily | undefined
    const rangeData = rangeSnap.exists ? rangeSnap.data() as RangeSummary : null

    const totalGuests = guestCountSnap.data().count || 0
    const totalUsers = userCountSnap.data().count || 0
    const totalLoginsFromDaily = last30DailySnap.docs.reduce((sum, doc) => {
      const data = doc.data() as MetricsDaily
      return sum + (data.totalLogins || 0)
    }, 0)
    const totalLogins = Math.max(totalLoginsFromDaily, last30LoginCount.data().count || 0)
    const guestConversions = last30DailySnap.docs.reduce((sum, doc) => {
      const data = doc.data() as MetricsDaily
      return sum + (data.guestConversions || 0)
    }, 0)
    const conversionRate = totalGuests > 0 ?
      Math.round((guestConversions / totalGuests) * 100) : 0

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
      topOperatingSystems: mapToTop(rangeData?.byOS || latestDaily?.byOS, "os"),
      byOS: rangeData?.byOS || latestDaily?.byOS || {},
      byProvider: rangeData?.byProvider || latestDaily?.byProvider || {},
      byTimezone: rangeData?.byTimezone || latestDaily?.byTimezone || {},
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

    // Calculate trends (% change from yesterday)
    const calculateGrowth = (today: number, yesterday: number): number => {
      if (yesterday === 0) return today > 0 ? 100 : 0
      return Math.round(((today - yesterday) / yesterday) * 100)
    }

    const todayGuests = todayData?.newGuests || 0
    const yesterdayGuests = yesterdayData?.newGuests || 0
    const todayUsers = todayData?.newUsers || 0
    const yesterdayUsers = yesterdayData?.newUsers || 0
    const todayLogins = todayData?.totalLogins || 0
    const yesterdayLogins = yesterdayData?.totalLogins || 0
    const todayConversion = todayData?.conversionRate || 0
    const yesterdayConversion = yesterdayData?.conversionRate || 0

    const trends = {
      guestsGrowth: calculateGrowth(todayGuests, yesterdayGuests),
      usersGrowth: calculateGrowth(todayUsers, yesterdayUsers),
      loginsGrowth: calculateGrowth(todayLogins, yesterdayLogins),
      conversionGrowth: calculateGrowth(todayConversion, yesterdayConversion),
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
export const computeRangeMetrics = onSchedule({
  schedule: "0 1 * * *",
}, async () => {
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
  const startTs = Timestamp.fromDate(new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    0, 0, 0, 0,
  )))
  const endExclusiveTs = Timestamp.fromDate(new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate() + 1,
    0, 0, 0, 0,
  )))

  // Generate array of dates
  const dates: string[] = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0])
  }

  // Fetch all daily metrics for the range
  const dailyMetricsPromises = dates.map((date) => db.doc(`metrics_daily/${date}`).get())
  const [dailySnapshots, loginHistorySnap, usersCreatedSnap, guestsCreatedSnap] = await Promise.all([
    Promise.all(dailyMetricsPromises),
    db.collectionGroup("login_history_Info")
      .where("timestamp", ">=", startTs)
      .where("timestamp", "<", endExclusiveTs)
      .get(),
    db.collection("users")
      .where("created_At", ">=", startTs)
      .where("created_At", "<", endExclusiveTs)
      .get(),
    db.collection("guests")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endExclusiveTs)
      .get(),
  ])

  const sourceLoginsByDate: Record<string, number> = {}
  const sourceUsersByDate: Record<string, number> = {}
  const sourceGuestsByDate: Record<string, number> = {}
  const sourceConversionsByDate: Record<string, number> = {}

  // Aggregate the data
  let totalGuests = 0
  let newGuests = 0
  let totalUsers = 0
  let newUsers = 0
  let totalLogins = 0
  let guestConversions = 0
  const byCountry: { [key: string]: number } = {}
  const byRegion: { [key: string]: number } = {}
  const byLocation: { [key: string]: number } = {}
  const byGeoCell: { [key: string]: number } = {}
  const byLatitudeBand: { [key: string]: number } = {}
  const byLongitudeBand: { [key: string]: number } = {}
  const byBrowser: { [key: string]: number } = {}
  const byDevice: { [key: string]: number } = {}
  const byOS: { [key: string]: number } = {}
  const byProvider: { [key: string]: number } = {}
  const byTimezone: { [key: string]: number } = {}
  const dailyBreakdown: Array<{
    date: string
    newGuests: number
    newUsers: number
    totalLogins: number
    guestConversions: number
    conversionRate: number
  }> = []

  loginHistorySnap.docs.forEach((doc) => {
    const login = doc.data() as loginHistoryInfo
    const tsValue = login.timestamp as unknown as { toDate?: () => Date }
    const dateKey = tsValue?.toDate ?
      tsValue.toDate().toISOString().split("T")[0] :
      new Date(login.timestamp as unknown as string).toISOString().split("T")[0]

    sourceLoginsByDate[dateKey] = (sourceLoginsByDate[dateKey] || 0) + 1

    const provider = login.providerId || "unknown"
    byProvider[provider] = (byProvider[provider] || 0) + 1
  })

  usersCreatedSnap.docs.forEach((doc) => {
    const user = doc.data() as Users
    const tsValue = user.created_At as unknown as { toDate?: () => Date }
    const dateKey = tsValue?.toDate ?
      tsValue.toDate().toISOString().split("T")[0] :
      new Date(user.created_At as unknown as string).toISOString().split("T")[0]

    sourceUsersByDate[dateKey] = (sourceUsersByDate[dateKey] || 0) + 1

    if (user.loginMetricsId) {
      sourceConversionsByDate[dateKey] = (sourceConversionsByDate[dateKey] || 0) + 1
    }
  })

  guestsCreatedSnap.docs.forEach((doc) => {
    const guest = doc.data() as Guest
    const tsValue = guest.createdAt as unknown as { toDate?: () => Date }
    const dateKey = tsValue?.toDate ?
      tsValue.toDate().toISOString().split("T")[0] :
      new Date(guest.createdAt as unknown as string).toISOString().split("T")[0]

    sourceGuestsByDate[dateKey] = (sourceGuestsByDate[dateKey] || 0) + 1

    byCountry[guest.country || "Unknown"] = (byCountry[guest.country || "Unknown"] || 0) + 1
    byRegion[guest.region || "Unknown"] = (byRegion[guest.region || "Unknown"] || 0) + 1
    byLocation[guest.location || "Unknown"] = (byLocation[guest.location || "Unknown"] || 0) + 1

    const geoCell =
      Number.isFinite(guest.latitude) && Number.isFinite(guest.longitude) ?
        `${Number(guest.latitude).toFixed(1)},${Number(guest.longitude).toFixed(1)}` :
        "Unknown"

    byGeoCell[geoCell] = (byGeoCell[geoCell] || 0) + 1

    const latBand = toLatitudeBand(guest.latitude)
    const lonBand = toLongitudeBand(guest.longitude)
    byLatitudeBand[latBand] = (byLatitudeBand[latBand] || 0) + 1
    byLongitudeBand[lonBand] = (byLongitudeBand[lonBand] || 0) + 1

    byBrowser[guest.browser || "Unknown"] = (byBrowser[guest.browser || "Unknown"] || 0) + 1
    byDevice[guest.device || "Unknown"] = (byDevice[guest.device || "Unknown"] || 0) + 1
    byOS[guest.os || "Unknown"] = (byOS[guest.os || "Unknown"] || 0) + 1
    byTimezone[guest.timezone || "Unknown"] = (byTimezone[guest.timezone || "Unknown"] || 0) + 1
  })

  dailySnapshots.forEach((snapshot, index) => {
    const data = snapshot.data() as MetricsDaily | undefined
    const date = dates[index]
    const sourceNewGuests = sourceGuestsByDate[date] || 0
    const sourceNewUsers = sourceUsersByDate[date] || 0
    const sourceTotalLogins = sourceLoginsByDate[date] || 0
    const sourceConversions = sourceConversionsByDate[date] || 0

    if (data) {
      const finalNewGuests = Math.max(data.newGuests || 0, sourceNewGuests)
      const finalNewUsers = Math.max(data.newUsers || 0, sourceNewUsers)
      const finalTotalLogins = Math.max(data.totalLogins || 0, sourceTotalLogins)
      const finalConversions = Math.max(data.guestConversions || 0, sourceConversions)

      totalGuests += finalNewGuests
      newGuests += finalNewGuests
      totalUsers += finalNewUsers
      newUsers += finalNewUsers
      totalLogins += finalTotalLogins
      guestConversions += finalConversions

      // Aggregate dimensions
      Object.entries(data.byCountry || {}).forEach(([country, count]) => {
        byCountry[country] = (byCountry[country] || 0) + count
      })

      const dataExt = data as MetricsDailyExtended

      Object.entries(dataExt.byRegion || {}).forEach(([region, count]) => {
        byRegion[region] = (byRegion[region] || 0) + (count as number)
      })

      Object.entries(dataExt.byLocation || {}).forEach(([location, count]) => {
        byLocation[location] = (byLocation[location] || 0) + (count as number)
      })

      Object.entries(dataExt.byGeoCell || {}).forEach(([cell, count]) => {
        byGeoCell[cell] = (byGeoCell[cell] || 0) + (count as number)
      })

      Object.entries(dataExt.byLatitudeBand || {}).forEach(([band, count]) => {
        byLatitudeBand[band] = (byLatitudeBand[band] || 0) + (count as number)
      })

      Object.entries(dataExt.byLongitudeBand || {}).forEach(([band, count]) => {
        byLongitudeBand[band] = (byLongitudeBand[band] || 0) + (count as number)
      })

      Object.entries(data.byBrowser || {}).forEach(([browser, count]) => {
        byBrowser[browser] = (byBrowser[browser] || 0) + count
      })

      Object.entries(data.byDevice || {}).forEach(([device, count]) => {
        byDevice[device] = (byDevice[device] || 0) + count
      })

      Object.entries(data.byOS || {}).forEach(([os, count]) => {
        byOS[os] = (byOS[os] || 0) + count
      })

      Object.entries(data.byTimezone || {}).forEach(([timezone, count]) => {
        byTimezone[timezone] = (byTimezone[timezone] || 0) + count
      })

      Object.entries(data.byProvider || {}).forEach(([provider, count]) => {
        byProvider[provider] = (byProvider[provider] || 0) + count
      })

      dailyBreakdown.push({
        date: date,
        newGuests: finalNewGuests,
        newUsers: finalNewUsers,
        totalLogins: finalTotalLogins,
        guestConversions: finalConversions,
        conversionRate: finalNewGuests > 0 ? Math.round((finalConversions / finalNewGuests) * 100) : 0,
      })
    } else {
      // Fill missing days with zeros
      dailyBreakdown.push({
        date: date,
        newGuests: sourceNewGuests,
        newUsers: sourceNewUsers,
        totalLogins: sourceTotalLogins,
        guestConversions: sourceConversions,
        conversionRate: sourceNewGuests > 0 ? Math.round((sourceConversions / sourceNewGuests) * 100) : 0,
      })

      totalGuests += sourceNewGuests
      newGuests += sourceNewGuests
      totalUsers += sourceNewUsers
      newUsers += sourceNewUsers
      totalLogins += sourceTotalLogins
      guestConversions += sourceConversions
    }
  })

  // Fallback: rebuild logins from raw login history if daily totals are missing
  if (totalLogins === 0) {
    const rangeStart = Timestamp.fromDate(new Date(`${startDate.toISOString().split("T")[0]}T00:00:00.000Z`))
    const rangeEndExclusiveDate = new Date(endDate)
    rangeEndExclusiveDate.setDate(rangeEndExclusiveDate.getDate() + 1)
    const rangeEndExclusive = Timestamp.fromDate(new Date(`${rangeEndExclusiveDate.toISOString().split("T")[0]}T00:00:00.000Z`))

    const loginEventsSnap = await db.collectionGroup("login_history_Info")
      .where("timestamp", ">=", rangeStart)
      .where("timestamp", "<", rangeEndExclusive)
      .get()

    loginEventsSnap.forEach((doc) => {
      const event = doc.data() as loginHistoryInfo
      const ts = event.timestamp as unknown
      const eventDateValue: Date | null =
        ts instanceof Date ? ts :
          (typeof ts === "object" && ts !== null && "toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") ?
            (ts as { toDate: () => Date }).toDate() : null
      if (!eventDateValue) {
        return
      }
      const eventDate = eventDateValue.toISOString().slice(0, 10)
      const day = dailyBreakdown.find((d) => d.date === eventDate)
      if (day) {
        day.totalLogins += 1
      }
      totalLogins += 1

      const providerKey = event.providerId || "unknown"
      byProvider[providerKey] = (byProvider[providerKey] || 0) + 1
    })
  }

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
    byRegion: byRegion,
    byLocation: byLocation,
    byGeoCell: byGeoCell,
    byLatitudeBand: byLatitudeBand,
    byLongitudeBand: byLongitudeBand,
    byBrowser: byBrowser,
    byDevice: byDevice,
    byOS: byOS,
    byProvider: byProvider,
    byTimezone: byTimezone,
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

// ============================================================================
// REAL-TIME PRESENCE — Active users in 1 min / 5 min / 30 min windows
// ============================================================================

/**
 * ⏱️ Runs every minute.
 * Counts authenticated users whose `presence/{userId}.lastSeen` falls within
 * the last 1 / 5 / 30 minutes and writes the totals to metrics_summary/dashboard.
 *
 * Client-side heartbeat: call `validateSessionCookie` every 60 s to keep the
 * presence document fresh. Guests call `recordGuestPresence` instead.
 */
export const computeActiveUsersNow = onSchedule(
  {
    schedule: "* * * * *", // every minute
    timeZone: "UTC",
    region: "us-central1",
  },
  async () => {
    try {
      const now = Date.now()
      const cutoff1m = Timestamp.fromMillis(now - 60 * 1000)
      const cutoff5m = Timestamp.fromMillis(now - 5 * 60 * 1000)
      const cutoff30m = Timestamp.fromMillis(now - 30 * 60 * 1000)

      // Count authenticated users active in each window (presence collection)
      const [snap1m, snap5m, snap30m] = await Promise.all([
        db.collection("presence").where("lastSeen", ">=", cutoff1m).count().get(),
        db.collection("presence").where("lastSeen", ">=", cutoff5m).count().get(),
        db.collection("presence").where("lastSeen", ">=", cutoff30m).count().get(),
      ])

      const activeUsersPerMinute = snap1m.data().count
      const activeUsersLast5m = snap5m.data().count
      const activeUsersLast30m = snap30m.data().count

      // Count guests active in each window (guests collection uses lastSeen too)
      const [gSnap1m, gSnap5m, gSnap30m] = await Promise.all([
        db.collection("guests").where("lastSeen", ">=", cutoff1m).count().get(),
        db.collection("guests").where("lastSeen", ">=", cutoff5m).count().get(),
        db.collection("guests").where("lastSeen", ">=", cutoff30m).count().get(),
      ])

      const activeGuestsPerMinute = gSnap1m.data().count
      const activeGuestsLast5m = gSnap5m.data().count
      const activeGuestsLast30m = gSnap30m.data().count

      await db.doc("metrics_summary/dashboard").set({
        // Authenticated users
        activeUsersPerMinute,
        activeUsersLast5m,
        activeUsersLast30m,
        // Guests
        activeGuestsPerMinute,
        activeGuestsLast5m,
        activeGuestsLast30m,
        // Combined
        onlineNow: activeUsersPerMinute + activeGuestsPerMinute,
        onlineLast5m: activeUsersLast5m + activeGuestsLast5m,
        onlineLast30m: activeUsersLast30m + activeGuestsLast30m,
        lastUpdated: Timestamp.now(),
      }, { merge: true })

      console.log(
        `✅ Active users — 1m: ${activeUsersPerMinute}, 5m: ${activeUsersLast5m}, 30m: ${activeUsersLast30m}`,
      )
    } catch (error) {
      console.error("❌ computeActiveUsersNow failed:", error)
    }
  },
)
