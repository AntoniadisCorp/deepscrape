import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'

import { FirestoreService } from './firestore.service'
import { loginHistoryInfo } from '../types'

export type AnalyticsPeriod =
  | 'last-30m'
  | 'last-1h'
  | 'last-24h'
  | 'last-7d'
  | 'last-30d'
  | 'last-90d'
  | 'custom'

export interface AnalyticsRangeRequest {
  period: AnalyticsPeriod
  customStartDate?: string | null
  customEndDate?: string | null
  now?: Date
}

export interface AnalyticsDailyBreakdown {
  date: string
  hour?: number
  totalLogins?: number
  newGuests?: number
  newUsers?: number
  guestConversions?: number
  conversionRate?: number
  byOS?: Record<string, number>
  byCountry?: Record<string, number>
  byBrowser?: Record<string, number>
  byDevice?: Record<string, number>
  byTimezone?: Record<string, number>
  byProvider?: Record<string, number>
  byRegion?: Record<string, number>
  byLanguage?: Record<string, number>
  byIP?: Record<string, number>
}

export interface AnalyticsRangeResult {
  rangeId: string
  startDate: string
  endDate: string
  totalGuests: number
  totalUsers: number
  totalLogins: number
  guestConversions: number
  conversionRate: number
  byOS: Record<string, number>
  byCountry: Record<string, number>
  byBrowser: Record<string, number>
  byDevice: Record<string, number>
  byTimezone: Record<string, number>
  byProvider: Record<string, number>
  byRegion?: Record<string, number>
  byLanguage?: Record<string, number>
  byIP?: Record<string, number>
  dailyBreakdown: AnalyticsDailyBreakdown[]
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsRangeService {
  private firestoreService = inject(FirestoreService)

  async getDashboardSummary(): Promise<any | null> {
    return this.firestoreService.getDashboardSummary()
  }

  async getRangeMetrics(rangeId: string): Promise<any | null> {
    return this.firestoreService.getRangeMetrics(rangeId)
  }

  async getMetricsByDateRange(startDate: string, endDate: string): Promise<any[]> {
    return this.firestoreService.getMetricsByDateRange(startDate, endDate)
  }

  async getHourlyMetricsByDateTimeRange(startKey: string, endKey: string): Promise<any[]> {
    return this.firestoreService.getHourlyMetricsByDateTimeRange(startKey, endKey)
  }

  getUserLoginSessionsByAdmin(targetUserId: string, limit: number = 50, activeOnly: boolean = false): Observable<{
    success: boolean
    targetUserId: string
    sessions: loginHistoryInfo[]
    total: number
  }> {
    return this.firestoreService.getUserLoginSessionsByAdmin(targetUserId, limit, activeOnly)
  }

  revokeUserLoginSessionByAdmin(loginId: string, reason?: string): Observable<{
    success: boolean
    loginId: string
    targetUserId: string
    revokedAt: string
  }> {
    return this.firestoreService.revokeUserLoginSessionByAdmin(loginId, reason)
  }

  async resolveRangeMetrics(request: AnalyticsRangeRequest): Promise<AnalyticsRangeResult | null> {
    switch (request.period) {
      case 'last-7d':
      case 'last-30d':
      case 'last-90d': {
        const precomputed = await this.firestoreService.getRangeMetrics(request.period)
        // Use pre-computed range doc if available (1 read, fastest path)
        if (precomputed) {
          return this.mapRangeResult(request.period, precomputed)
        }
        // Fallback: compute on-the-fly from metrics_daily so the dashboard
        // never silently shows wrong period data. This is slightly more
        // expensive (N reads for N days) but ensures correctness.
        const days = request.period === 'last-7d' ? 7 : request.period === 'last-30d' ? 30 : 90
        const end = request.now ? new Date(request.now) : new Date()
        const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
        const startDate = start.toISOString().slice(0, 10)
        const endDate = end.toISOString().slice(0, 10)
        console.warn(`⚠️ Pre-computed range "${request.period}" not found — computing on-the-fly from ${startDate} to ${endDate}`)
        return this.buildCustomDateRangeMetrics(startDate, endDate)
      }
      case 'last-24h':
        return this.buildHourlyRangeMetrics(24, 'last-24h', request.now)
      case 'last-1h':
        return this.buildHourlyRangeMetrics(1, 'last-1h', request.now)
      case 'last-30m':
        return this.buildHourlyRangeMetrics(1, 'last-30m', request.now)
      case 'custom':
        return this.buildCustomDateRangeMetrics(request.customStartDate, request.customEndDate)
      default: {
        const fallback = await this.firestoreService.getRangeMetrics('last-7d')
        return this.mapRangeResult('last-7d', fallback)
      }
    }
  }

  private async buildCustomDateRangeMetrics(
    customStartDate?: string | null,
    customEndDate?: string | null,
  ): Promise<AnalyticsRangeResult | null> {
    if (!customStartDate || !customEndDate) {
      const fallback = await this.firestoreService.getRangeMetrics('last-7d')
      return this.mapRangeResult('last-7d', fallback)
    }

    const rows = await this.firestoreService.getMetricsByDateRange(customStartDate, customEndDate)
    const sortedRows = [...rows].sort((a: AnalyticsDailyBreakdown, b: AnalyticsDailyBreakdown) =>
      String(a.date || '').localeCompare(String(b.date || '')),
    )

    const byOS: Record<string, number> = {}
    const byCountry: Record<string, number> = {}
    const byBrowser: Record<string, number> = {}
    const byDevice: Record<string, number> = {}
    const byTimezone: Record<string, number> = {}
    const byProvider: Record<string, number> = {}
    const byRegion: Record<string, number> = {}
    const byLanguage: Record<string, number> = {}
    const byIP: Record<string, number> = {}

    let totalGuests = 0
    let totalUsers = 0
    let totalLogins = 0
    let guestConversions = 0

    for (const rawRow of sortedRows) {
      const row = this.normalizeDailyBreakdownRow(rawRow)
      totalGuests += Number(row.newGuests || 0)
      totalUsers += Number(row.newUsers || 0)
      totalLogins += Number(row.totalLogins || 0)
      guestConversions += Number(row.guestConversions || 0)

      this.mergeDimensionCounts(byOS, row.byOS, 'Unknown OS')
      this.mergeDimensionCounts(byCountry, row.byCountry, 'Unknown Country')
      this.mergeDimensionCounts(byBrowser, row.byBrowser, 'Unknown Browser')
      this.mergeDimensionCounts(byDevice, row.byDevice, 'Unknown Device')
      this.mergeDimensionCounts(byTimezone, row.byTimezone, 'Unknown Timezone')
      this.mergeDimensionCounts(byProvider, row.byProvider, 'unknown')
      this.mergeDimensionCounts(byRegion, row.byRegion, 'Unknown Region')
      this.mergeDimensionCounts(byLanguage, row.byLanguage, 'Unknown Language')
      this.mergeDimensionCounts(byIP, row.byIP, 'Unknown IP')
    }

    return {
      rangeId: 'custom',
      startDate: customStartDate,
      endDate: customEndDate,
      totalGuests,
      totalUsers,
      totalLogins,
      guestConversions,
      conversionRate: totalGuests > 0 ? Math.round((guestConversions / totalGuests) * 100) : 0,
      byOS,
      byCountry,
      byBrowser,
      byDevice,
      byTimezone,
      byProvider,
      byRegion,
      byLanguage,
      byIP,
      dailyBreakdown: sortedRows.map((row: AnalyticsDailyBreakdown) => ({
        date: String(row.date || ''),
        newGuests: Number(row.newGuests || 0),
        newUsers: Number(row.newUsers || 0),
        totalLogins: Number(row.totalLogins || 0),
        guestConversions: Number(row.guestConversions || 0),
        conversionRate: Number(row.conversionRate || 0),
      })),
    }
  }

  private async buildHourlyRangeMetrics(hours: number, rangeId: string, now?: Date): Promise<AnalyticsRangeResult> {
    const end = now ? new Date(now) : new Date()
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000)

    const rows = await this.firestoreService.getHourlyMetricsByDateTimeRange(
      this.toDateTimeKey(start),
      this.toDateTimeKey(end),
    )

    const totalGuests = rows.reduce((sum: number, row: AnalyticsDailyBreakdown) => sum + Number(row.newGuests || 0), 0)
    const totalUsers = rows.reduce((sum: number, row: AnalyticsDailyBreakdown) => sum + Number(row.newUsers || 0), 0)
    const totalLogins = rows.reduce((sum: number, row: AnalyticsDailyBreakdown) => sum + Number(row.totalLogins || 0), 0)
    const guestConversions = rows.reduce((sum: number, row: AnalyticsDailyBreakdown) => sum + Number(row.guestConversions || 0), 0)

    const byOS: Record<string, number> = {}
    const byCountry: Record<string, number> = {}
    const byBrowser: Record<string, number> = {}
    const byDevice: Record<string, number> = {}
    const byTimezone: Record<string, number> = {}
    const byProvider: Record<string, number> = {}
    const byRegion: Record<string, number> = {}
    const byLanguage: Record<string, number> = {}
    const byIP: Record<string, number> = {}

    for (const rawRow of rows) {
      const row = this.normalizeDailyBreakdownRow(rawRow)
      this.mergeDimensionCounts(byOS, row.byOS, 'Unknown OS')
      this.mergeDimensionCounts(byCountry, row.byCountry, 'Unknown Country')
      this.mergeDimensionCounts(byBrowser, row.byBrowser, 'Unknown Browser')
      this.mergeDimensionCounts(byDevice, row.byDevice, 'Unknown Device')
      this.mergeDimensionCounts(byTimezone, row.byTimezone, 'Unknown Timezone')
      this.mergeDimensionCounts(byProvider, row.byProvider, 'unknown')
      this.mergeDimensionCounts(byRegion, row.byRegion, 'Unknown Region')
      this.mergeDimensionCounts(byLanguage, row.byLanguage, 'Unknown Language')
      this.mergeDimensionCounts(byIP, row.byIP, 'Unknown IP')
    }

    return {
      rangeId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalGuests,
      totalUsers,
      totalLogins,
      guestConversions,
      conversionRate: totalGuests > 0 ? Math.round((guestConversions / totalGuests) * 100) : 0,
      byOS,
      byCountry,
      byBrowser,
      byDevice,
      byTimezone,
      byProvider,
      byRegion,
      byLanguage,
      byIP,
      dailyBreakdown: rows.map((row: AnalyticsDailyBreakdown) => {
        const hour = Number(row.hour ?? 0)
        const newGuests = Number(row.newGuests || 0)
        const rowGuestConversions = Number(row.guestConversions || 0)

        return {
          date: `${String(row.date || '')}T${String(hour).padStart(2, '0')}:00:00.000Z`,
          hour,
          newGuests,
          newUsers: Number(row.newUsers || 0),
          totalLogins: Number(row.totalLogins || 0),
          guestConversions: rowGuestConversions,
          conversionRate: newGuests > 0 ? Math.round((rowGuestConversions / newGuests) * 100) : 0,
        }
      }),
    }
  }

  private mapRangeResult(rangeId: string, raw: any | null): AnalyticsRangeResult | null {
    if (!raw) {
      return null
    }

    const startDate = String(raw.startDate || '')
    const endDate = String(raw.endDate || '')

    return {
      rangeId,
      startDate,
      endDate,
      totalGuests: Number(raw.totalGuests || raw.newGuests || 0),
      totalUsers: Number(raw.totalUsers || raw.newUsers || 0),
      totalLogins: Number(raw.totalLogins || raw.logins || 0),
      guestConversions: Number(raw.guestConversions || raw.registeredGuests || raw.conversions || 0),
      conversionRate: Number(raw.conversionRate || 0),
      byOS: this.asNumberMap(raw.byOS),
      byCountry: this.asNumberMap(raw.byCountry),
      byBrowser: this.asNumberMap(raw.byBrowser),
      byDevice: this.asNumberMap(raw.byDevice),
      byTimezone: this.asNumberMap(raw.byTimezone),
      byProvider: this.asNumberMap(raw.byProvider),
      byRegion: this.asNumberMap(raw.byRegion),
      byLanguage: this.asNumberMap(raw.byLanguage),
      byIP: this.asNumberMap(raw.byIP),
      dailyBreakdown: Array.isArray(raw.dailyBreakdown)
        ? raw.dailyBreakdown.map((row: AnalyticsDailyBreakdown) => ({
            date: String(row.date || ''),
            hour: typeof row.hour === 'number' ? row.hour : undefined,
            totalLogins: Number(row.totalLogins || 0),
            newGuests: Number(row.newGuests || 0),
            newUsers: Number(row.newUsers || 0),
            guestConversions: Number(row.guestConversions || 0),
            conversionRate: Number(row.conversionRate || 0),
            byOS: this.asNumberMap(row.byOS),
            byCountry: this.asNumberMap(row.byCountry),
            byBrowser: this.asNumberMap(row.byBrowser),
            byDevice: this.asNumberMap(row.byDevice),
            byTimezone: this.asNumberMap(row.byTimezone),
            byProvider: this.asNumberMap(row.byProvider),
            byRegion: this.asNumberMap(row.byRegion),
            byLanguage: this.asNumberMap(row.byLanguage),
            byIP: this.asNumberMap(row.byIP),
          }))
        : [],
    }
  }

  private mergeDimensionCounts(
    target: Record<string, number>,
    source: Record<string, number> | undefined,
    fallback: string,
  ): void {
    for (const [key, value] of Object.entries(source || {})) {
      const normalizedKey = this.normalizeDimensionKey(key, fallback)
      target[normalizedKey] = (target[normalizedKey] || 0) + Number(value || 0)
    }
  }

  private asNumberMap(source: unknown): Record<string, number> {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(source as Record<string, unknown>).map(([key, value]) => {
        const normalizedKey = this.normalizeDimensionKey(key)
        return [normalizedKey, Number(value || 0)]
      }),
    )
  }

  private normalizeDimensionKey(value: string | undefined, fallback: string = 'Unknown'): string {
    const normalized = String(value || '').trim()
    return normalized || fallback
  }

  /**
   * Build a dimension map from a daily/hourly row that may store breakdowns
   * EITHER as a nested map (byBrowser: { Chrome: n }) OR as flat dotted fields
   * written by the realtime triggers (byBrowser.Chrome: n).
   * ponytail: normalizing at read time fixes both existing flat days and future
   * writes with no migration and no change to the write path.
   */
  private extractDimension(doc: Record<string, unknown> | undefined, prefix: string): Record<string, number> {
    const out: Record<string, number> = {}
    if (!doc) {
      return out
    }

    const nested = doc[prefix]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
        const dim = this.normalizeDimensionKey(k)
        out[dim] = (out[dim] || 0) + Number(v || 0)
      }
    }

    for (const k of Object.keys(doc)) {
      if (k.startsWith(`${prefix}.`)) {
        const dim = this.normalizeDimensionKey(k.slice(prefix.length + 1))
        out[dim] = (out[dim] || 0) + Number(doc[k] || 0)
      }
    }

    return out
  }

  private normalizeDailyBreakdownRow(raw: AnalyticsDailyBreakdown): AnalyticsDailyBreakdown {
    const obj = raw as unknown as Record<string, unknown>
    return {
      ...raw,
      byOS: this.extractDimension(obj, 'byOS'),
      byCountry: this.extractDimension(obj, 'byCountry'),
      byBrowser: this.extractDimension(obj, 'byBrowser'),
      byDevice: this.extractDimension(obj, 'byDevice'),
      byTimezone: this.extractDimension(obj, 'byTimezone'),
      byProvider: this.extractDimension(obj, 'byProvider'),
      byRegion: this.extractDimension(obj, 'byRegion'),
      byLanguage: this.extractDimension(obj, 'byLanguage'),
      byIP: this.extractDimension(obj, 'byIP'),
    }
  }

  private toDateTimeKey(date: Date): string {
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    const h = String(date.getUTCHours()).padStart(2, '0')
    return `${y}-${m}-${d}-${h}`
  }
}
