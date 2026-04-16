/* eslint-disable max-len */
/* eslint-disable valid-jsdoc */
/* eslint-disable object-curly-spacing */

import * as admin from "firebase-admin"
import { DimensionFilter, MetricsDaily } from "./analytics-optimized.domain"

/**
 * Convert period shorthand to date range
 */
export function periodToDateRange(period: string):
{ startDate: string; endDate: string } {
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split("T")[0]

  switch (period) {
  case "today":
    return { startDate: formatDate(today), endDate: formatDate(today) }

  case "yesterday": {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return { startDate: formatDate(yesterday), endDate: formatDate(yesterday) }
  }

  case "last7days": {
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    return { startDate: formatDate(sevenDaysAgo), endDate: formatDate(today) }
  }

  case "last30days": {
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    return { startDate: formatDate(thirtyDaysAgo), endDate: formatDate(today) }
  }

  case "last90days": {
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(today.getDate() - 90)
    return { startDate: formatDate(ninetyDaysAgo), endDate: formatDate(today) }
  }

  case "thisMonth": {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    return { startDate: formatDate(firstDay), endDate: formatDate(today) }
  }

  case "lastMonth": {
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    return { startDate: formatDate(firstDayLastMonth), endDate: formatDate(lastDayLastMonth) }
  }

  case "thisYear": {
    const firstDay = new Date(today.getFullYear(), 0, 1)
    return { startDate: formatDate(firstDay), endDate: formatDate(today) }
  }

  default:
    return { startDate: formatDate(today), endDate: formatDate(today) }
  }
}

/**
 * Filter metrics by dimension filters
 */
export function filterByDimensions(data: MetricsDaily[], filter: DimensionFilter): MetricsDaily[] {
  if (!filter.country && !filter.device && !filter.browser && !filter.provider) {
    return data // No filters applied
  }

  return data.map((dayMetrics) => {
    const filtered = { ...dayMetrics }

    // Filter by country
    if (filter.country) {
      const countries = Array.isArray(filter.country) ? filter.country : [filter.country]
      filtered.byCountry = Object.fromEntries(
        Object.entries(dayMetrics.byCountry || {}).filter(([country]) =>
          countries.includes(country)
        )
      )
    }

    // Filter by device (map device types to actual device names)
    if (filter.device) {
      const deviceMap: { [key: string]: string[] } = {
        desktop: ["Windows", "Mac", "Linux", "Other"],
        mobile: ["Mobile", "iPhone", "Android"],
        tablet: ["iPad", "Tablet"],
      }
      const deviceNames = deviceMap[filter.device as keyof typeof deviceMap] || [filter.device]
      filtered.byDevice = Object.fromEntries(
        Object.entries(dayMetrics.byDevice || {}).filter(([device]) =>
          deviceNames.some((name: string) => device.toLowerCase().includes(name.toLowerCase()))
        )
      )
    }

    // Filter by browser
    if (filter.browser) {
      const browsers = Array.isArray(filter.browser) ? filter.browser : [filter.browser]
      filtered.byBrowser = Object.fromEntries(
        Object.entries(dayMetrics.byBrowser || {}).filter(([browser]) =>
          browsers.includes(browser)
        )
      )
    }

    // Filter by provider
    if (filter.provider) {
      const providerMap: { [key: string]: string[] } = {
        google: ["google.com"],
        github: ["github.com"],
        password: ["password"],
        phone: ["phone"],
      }
      const providerNames = providerMap[filter.provider as keyof typeof providerMap] || [filter.provider]
      filtered.byProvider = Object.fromEntries(
        Object.entries(dayMetrics.byProvider || {}).filter(([provider]) =>
          providerNames.includes(provider)
        )
      )
    }

    return filtered
  })
}

/**
 * Aggregate metrics by granularity (daily, weekly, monthly)
 */
export function aggregateByGranularity(
  data: MetricsDaily[],
  granularity: "daily" | "weekly" | "monthly"
): MetricsDaily[] {
  if (granularity === "daily") {
    return data // Already daily
  }

  // Group by week or month
  const groups = new Map<string, MetricsDaily[]>()

  data.forEach((dayMetrics) => {
    const date = new Date(dayMetrics.date)
    let key: string

    if (granularity === "weekly") {
      // Get week start (Monday)
      const dayOfWeek = date.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() + diff)
      key = weekStart.toISOString().split("T")[0]
    } else {
      // Monthly
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    const group = groups.get(key)
    if (group) {
      group.push(dayMetrics)
    }
  })

  // Aggregate each group
  return Array.from(groups.entries()).map(([key, metrics]) => {
    const aggregated: MetricsDaily = {
      date: key,
      timestamp: admin.firestore.Timestamp.now(),
      totalGuests: 0,
      newGuests: 0,
      activeGuests: 0,
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      totalLogins: 0,
      loginsByHour: {},
      guestsByHour: {},
      usersByHour: {},
      guestConversions: 0,
      conversionRate: 0,
      byCountry: {},
      byBrowser: {},
      byDevice: {},
      byOS: {},
      byProvider: {},
      byTimezone: {},
      topCountries: [],
      topBrowsers: [],
      updatedAt: admin.firestore.Timestamp.now(),
    }

    metrics.forEach((m) => {
      aggregated.totalGuests += m.totalGuests || 0
      aggregated.newGuests += m.newGuests || 0
      aggregated.activeGuests += m.activeGuests || 0
      aggregated.totalUsers += m.totalUsers || 0
      aggregated.newUsers += m.newUsers || 0
      aggregated.activeUsers += m.activeUsers || 0
      aggregated.totalLogins += m.totalLogins || 0
      aggregated.guestConversions += m.guestConversions || 0

      // Aggregate hourly logins
      Object.entries(m.loginsByHour || {}).forEach(([k, v]) => {
        aggregated.loginsByHour[k] = (aggregated.loginsByHour[k] || 0) + v
      })

      // Aggregate by dimensions
      Object.entries(m.byCountry || {}).forEach(([k, v]) => {
        aggregated.byCountry[k] = (aggregated.byCountry[k] || 0) + v
      })
      Object.entries(m.byBrowser || {}).forEach(([k, v]) => {
        aggregated.byBrowser[k] = (aggregated.byBrowser[k] || 0) + v
      })
      Object.entries(m.byDevice || {}).forEach(([k, v]) => {
        aggregated.byDevice[k] = (aggregated.byDevice[k] || 0) + v
      })
      Object.entries(m.byOS || {}).forEach(([k, v]) => {
        aggregated.byOS[k] = (aggregated.byOS[k] || 0) + v
      })
      Object.entries(m.byProvider || {}).forEach(([k, v]) => {
        aggregated.byProvider[k] = (aggregated.byProvider[k] || 0) + v
      })
      Object.entries(m.byTimezone || {}).forEach(([k, v]) => {
        aggregated.byTimezone[k] = (aggregated.byTimezone[k] || 0) + v
      })
    })

    // Calculate conversion rate
    aggregated.conversionRate = aggregated.newGuests > 0 ?
      (aggregated.guestConversions / aggregated.newGuests) * 100 : 0

    return aggregated
  })
}

/**
 * Get top N entries from a dimension object
 */
export function getTopN<T extends Record<string, number>>(
  obj: T,
  n: number
): Array<{ key: string; value: number }> {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key, value]) => ({ key, value }))
}
