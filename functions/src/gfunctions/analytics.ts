/* eslint-disable valid-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
import { Request, Response, NextFunction } from "express"
import { getClientIp } from "request-ip"
import { parseUA } from "../infrastructure/ua-parser"
import { ANALYTICS_EVENTS, buildAnalyticsEvent, Guest } from "../domain"
import { parseCachedJson, redis } from "../app/cacheConfig"
import {
  ANALYTICS_EVENTS_KEY,
  CLIENT_EVENT_LIST_MAX,
  CLIENT_EVENT_MAX,
  CLIENT_EVENT_PROP_MAX,
  GEO_CACHE_FAILURE_TTL_SECONDS,
  GEO_CACHE_TTL_SECONDS,
  GUEST_FINGERPRINT_TTL_SECONDS,
  GUEST_LAST_SEEN_WRITE_INTERVAL_MS,
  PRESENCE_TTL_SECONDS,
  geoCacheKey,
  guestFingerprintKey,
  presenceGuestKey,
} from "../../../src/config/redis-keys"
import { db } from "../app/config"
import { FieldValue } from "firebase-admin/firestore"
import net from "node:net"
import crypto from "crypto"
import { env } from "../config/env"

// Determine if running in production based on environment variable
const isProduction = env.IS_PRODUCTION

export type ResolvedNetworkData = {
  asn: string | null
  as: string | null
  isp: string | null
  domain: string | null
  usageType: string | null
}

export type ResolvedProxyData = {
  isProxy: boolean
  proxyType: string | null
  threat: string | null
  lastSeenDays: number | null
  provider: string | null
  fraudScore: number | null
  confidence: "none" | "open-proxy-detected" | "unknown"
}

const geoApiBaseUrl = (env.IP_GEO_API_URL || "https://ip.deepscrape.dev/api/geo/lookup").trim().replace(/\/+$/, "")
// When IPREGISTRY_API_KEY is set, lookups go to ipregistry instead of the custom geo API.
const ipregistryApiKey = env.IPREGISTRY_API_KEY.trim()
const geoCacheTtlSeconds = GEO_CACHE_TTL_SECONDS
// A failed lookup is cached too, but for far less time: see redis-keys.ts.
const geoFailureCacheTtlSeconds = GEO_CACHE_FAILURE_TTL_SECONDS

// ponytail: coalesce concurrent cold-miss lookups for the same IP (rate limiter +
// guest/session enrichment on one first-seen visitor) into a single provider call.
// Instance-local only; Redis cache dedupes across instances and over time.
const inflightGeoLookups = new Map<string, Promise<ResolvedGeoData | null>>()

let geoInitializationPromise: Promise<void> | null = null

export type ResolvedGeoData = {
  ip: string
  countryShort: string
  countryLong: string
  region: string
  city: string
  latitude: number | null
  longitude: number | null
  timeZone: string
  asn: string | null
  as: string | null
  isp: string | null
  domain: string | null
  usageType: string | null
  network: ResolvedNetworkData
  proxy: ResolvedProxyData
}

type CachedGeoLookup = {
  hit: boolean
  data: ResolvedGeoData | null
}

type GeoLookupApiLocation = {
  countryCode?: string | null
  countryName?: string | null
  region?: string | null
  city?: string | null
  postalCode?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  timeZoneOffset?: string | null
  timeZoneName?: string | null
}

type GeoLookupApiNetwork = {
  asn?: string | number | null
  asName?: string | null
  isp?: string | null
  domain?: string | null
  usageType?: string | null
}

type GeoLookupApiProxy = {
  isProxy?: boolean | number | string | null
  proxyType?: string | null
  threat?: string | null
  lastSeenDays?: number | string | null
  provider?: string | null
  fraudScore?: number | string | null
}

type GeoLookupApiCoverage = {
  geo?: boolean
  asn?: boolean
  proxy?: boolean
}

type GeoLookupApiEnvelope = {
  lookup?: GeoLookupApiResponse | null
}

type GeoLookupApiResponse = {
  ip?: string | null
  requestedAt?: string | null
  expectedProxy?: boolean | null
  location?: GeoLookupApiLocation | null
  network?: GeoLookupApiNetwork | null
  proxy?: GeoLookupApiProxy | null
  coverage?: GeoLookupApiCoverage | null
  data?: GeoLookupApiEnvelope | null
  countryCode?: string | null
  countryName?: string | null
  countryShort?: string | null
  countryLong?: string | null
  region?: string | null
  city?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  timeZoneOffset?: string | null
  timeZoneName?: string | null
  timezone?: string | null
  asn?: string | number | null
  asName?: string | null
  as?: string | null
  isp?: string | null
  domain?: string | null
  usageType?: string | null
  isProxy?: boolean | number | string | null
  proxyType?: string | null
  threat?: string | null
  lastSeenDays?: number | string | null
  provider?: string | null
  fraudScore?: number | string | null
}

export type GeoLookupRequestContext = {
  firebaseUid?: string | null
  userRoles?: string | string[] | null
  requestId?: string | null
  forwardedFor?: string | null
}

export function normalizeGeoLookupRoles(...values: unknown[]): string[] {
  const roles: string[] = []

  const appendRoleValue = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        appendRoleValue(entry)
      }
      return
    }

    const text = String(value ?? "").trim()
    if (!text) {
      return
    }

    for (const part of text.split(",")) {
      const role = part.trim().toLowerCase()
      if (role) {
        roles.push(role)
      }
    }
  }

  for (const value of values) {
    appendRoleValue(value)
  }

  return Array.from(new Set(roles))
}

function compactRoleHeader(value: GeoLookupRequestContext["userRoles"]): string {
  return normalizeGeoLookupRoles(value).join(",")
}

function createGeoRequestId(input: string | null | undefined): string {
  const requestId = String(input || "").trim()
  if (requestId) {
    return requestId
  }

  return `geo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function buildGeoLookupHeaders(
  ip: string,
  context?: GeoLookupRequestContext
): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "x-firebase-uid": String(context?.firebaseUid || "functions-system").trim() || "functions-system",
    "x-user-roles": compactRoleHeader(context?.userRoles) || "guest",
    "x-request-id": createGeoRequestId(context?.requestId),
  }

  const normalizedForwarded = normalizePublicIp(context?.forwardedFor || ip)
  if (normalizedForwarded) {
    headers["x-forwarded-for"] = normalizedForwarded
  }

  return headers
}

export function normalizePublicIp(value: string | null | undefined): string {
  const raw = String(value || "").trim()
  if (!raw) {
    return ""
  }

  const first = raw.split(",")[0]?.trim() || ""
  if (first.startsWith("::ffff:")) {
    return first.substring(7)
  }

  return first
}

function buildGeoLookupUrl(ip: string): string {
  const url = new URL(geoApiBaseUrl)
  if (ip) {
    url.searchParams.set("ip", ip)
  }
  return url.toString()
}

function sanitizeText(value: unknown): string | null {
  const text = String(value || "").trim()
  if (!text || text === "-") {
    return null
  }

  const normalized = text.toLowerCase()
  if (normalized === "null" || normalized === "undefined" || normalized === "n/a") {
    return null
  }

  return text
}

function parseNullableNumber(value: unknown): number | null {
  const text = sanitizeText(value)
  if (!text) {
    return null
  }

  const num = Number(text)
  return Number.isFinite(num) ? num : null
}

function resolveProxyConfidence(args: {
  isProxy: boolean
  coverage: GeoLookupApiCoverage | null | undefined
}): ResolvedProxyData["confidence"] {
  if (args.isProxy) {
    return "open-proxy-detected"
  }

  return args.coverage?.proxy === true ? "none" : "unknown"
}

function mapGeoLookupResponse(payload: GeoLookupApiResponse, fallbackIp: string): ResolvedGeoData | null {
  const lookupPayload = payload.data?.lookup && typeof payload.data.lookup === "object" ? payload.data.lookup : payload

  const location = lookupPayload.location || {
    countryCode: lookupPayload.countryCode || lookupPayload.countryShort || null,
    countryName: lookupPayload.countryName || lookupPayload.countryLong || null,
    region: lookupPayload.region || null,
    city: lookupPayload.city || null,
    latitude: lookupPayload.latitude ?? null,
    longitude: lookupPayload.longitude ?? null,
    timeZoneOffset: lookupPayload.timeZoneOffset || lookupPayload.timezone || null,
    timeZoneName: lookupPayload.timeZoneName || lookupPayload.timezone || null,
  }

  const network = lookupPayload.network || {
    asn: lookupPayload.asn ?? null,
    asName: lookupPayload.asName || lookupPayload.as || null,
    isp: lookupPayload.isp || null,
    domain: lookupPayload.domain || null,
    usageType: lookupPayload.usageType || null,
  }

  const proxy = lookupPayload.proxy || {
    isProxy: lookupPayload.isProxy ?? null,
    proxyType: lookupPayload.proxyType || null,
    threat: lookupPayload.threat || null,
    lastSeenDays: lookupPayload.lastSeenDays ?? null,
    provider: lookupPayload.provider || null,
    fraudScore: lookupPayload.fraudScore ?? null,
  }

  const coverage = lookupPayload.coverage || payload.coverage

  const countryShort = sanitizeText(location.countryCode)
  if (!countryShort) {
    return null
  }

  const countryLong = sanitizeText(location.countryName) || "Unknown"
  const region = sanitizeText(location.region) || "Unknown"
  const city = sanitizeText(location.city) || "Unknown"
  const latitude = parseNullableNumber(location.latitude)
  const longitude = parseNullableNumber(location.longitude)
  const timeZone = sanitizeText(location.timeZoneName) || sanitizeText(location.timeZoneOffset) || "UTC"

  const asn = sanitizeText(network.asn)
  const asName = sanitizeText(network.asName)
  const isp = sanitizeText(network.isp)
  const domain = sanitizeText(network.domain)
  const usageType = sanitizeText(network.usageType)
  const isProxy = proxy.isProxy === true || proxy.isProxy === 1 || proxy.isProxy === "1" || proxy.isProxy === "true"

  const proxyData: ResolvedProxyData = {
    isProxy,
    proxyType: sanitizeText(proxy.proxyType),
    threat: sanitizeText(proxy.threat),
    lastSeenDays: parseNullableNumber(proxy.lastSeenDays),
    provider: sanitizeText(proxy.provider),
    fraudScore: parseNullableNumber(proxy.fraudScore),
    confidence: resolveProxyConfidence({ isProxy, coverage }),
  }

  const resolvedIp = sanitizeText(lookupPayload.ip) || sanitizeText(payload.ip) || fallbackIp
  if (!resolvedIp) {
    return null
  }

  const networkData: ResolvedNetworkData = {
    asn,
    as: asName,
    isp,
    domain,
    usageType,
  }

  return {
    ip: resolvedIp,
    countryShort,
    countryLong,
    region,
    city,
    latitude,
    longitude,
    timeZone,
    asn,
    as: asName,
    isp,
    domain,
    usageType,
    network: networkData,
    proxy: proxyData,
  }
}

type IpregistryPayload = {
  ip?: unknown
  location?: {
    country?: { code?: unknown; name?: unknown }
    region?: { name?: unknown }
    city?: unknown
    latitude?: unknown
    longitude?: unknown
  }
  connection?: {
    asn?: unknown
    domain?: unknown
    organization?: unknown
    type?: unknown
  }
  company?: {
    domain?: unknown
    type?: unknown
  }
  time_zone?: {
    id?: unknown
  }
  security?: {
    is_proxy?: unknown
    is_vpn?: unknown
    is_tor?: unknown
    is_threat?: unknown
    is_abuser?: unknown
    is_attacker?: unknown
  }
}

export function mapIpregistryResponse(
  payload: IpregistryPayload,
  fallbackIp: string
): ResolvedGeoData | null {
  const location = payload.location || {}
  const connection = payload.connection || {}
  const company = payload.company || {}
  const security = payload.security || {}

  const countryShort = sanitizeText(location.country?.code)
  if (!countryShort) {
    return null
  }

  const countryLong = sanitizeText(location.country?.name) || "Unknown"
  const region = sanitizeText(location.region?.name) || "Unknown"
  const city = sanitizeText(location.city) || "Unknown"
  const latitude = parseNullableNumber(location.latitude)
  const longitude = parseNullableNumber(location.longitude)
  const timeZone = sanitizeText(payload.time_zone?.id) || "UTC"

  const asn = sanitizeText(connection.asn)
  // ponytail: ipregistry has no isp/proxy_type/fraud fields. isp=AS org, proxyType derived from flags.
  const asName = sanitizeText(connection.organization)
  const domain = sanitizeText(connection.domain) || sanitizeText(company.domain)
  const usageType = sanitizeText(connection.type) || sanitizeText(company.type)

  const isProxy = security.is_proxy === true || security.is_vpn === true || security.is_tor === true
  const proxyType = security.is_tor === true ? "tor" : security.is_vpn === true ? "vpn" : security.is_proxy === true ? "proxy" : null
  const threat = security.is_threat === true ? "is_threat" :
    security.is_abuser === true ? "is_abuser" :
      security.is_attacker === true ? "is_attacker" : null

  const proxyData: ResolvedProxyData = {
    isProxy,
    proxyType,
    threat,
    lastSeenDays: null,
    provider: null,
    fraudScore: null,
    confidence: isProxy ? "open-proxy-detected" : "none",
  }

  const networkData: ResolvedNetworkData = {
    asn,
    as: asName,
    isp: asName,
    domain,
    usageType,
  }

  return {
    ip: sanitizeText(payload.ip) || fallbackIp,
    countryShort,
    countryLong,
    region,
    city,
    latitude,
    longitude,
    timeZone,
    asn,
    as: asName,
    isp: asName,
    domain,
    usageType,
    network: networkData,
    proxy: proxyData,
  }
}

async function fetchIpregistryLookup(ip: string): Promise<ResolvedGeoData | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const url = `https://api.ipregistry.co/${encodeURIComponent(ip)}?key=${encodeURIComponent(ipregistryApiKey)}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }

      throw new Error(`Ipregistry lookup returned ${response.status}`)
    }

    const payload = await response.json() as IpregistryPayload
    return mapIpregistryResponse(payload, ip)
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchGeoLookup(
  ip: string,
  context?: GeoLookupRequestContext
): Promise<ResolvedGeoData | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(buildGeoLookupUrl(ip), {
      method: "GET",
      headers: buildGeoLookupHeaders(ip, context),
      signal: controller.signal,
    })

    if (!response.ok) {
      if (response.status === 404 || response.status === 204) {
        return null
      }

      throw new Error(`Geo lookup API returned ${response.status}`)
    }

    const payload = await response.json() as GeoLookupApiResponse
    return mapGeoLookupResponse(payload, ip)
  } finally {
    clearTimeout(timeout)
  }
}

function buildGeoCacheKey(ip: string): string {
  const digest = crypto.createHash("sha256").update(ip).digest("hex")
  return geoCacheKey(digest)
}

async function readCachedGeoLookup(ip: string): Promise<CachedGeoLookup> {
  try {
    const cached = await redis.get(buildGeoCacheKey(ip))
    const parsed = parseCachedJson<{ miss?: boolean; data?: ResolvedGeoData | null }>(cached)
    if (!parsed) {
      return { hit: false, data: null }
    }
    if (parsed?.miss) {
      return { hit: true, data: null }
    }

    return { hit: true, data: parsed?.data || null }
  } catch (error) {
    console.warn("Failed to read IP intelligence cache:", error)
    return { hit: false, data: null }
  }
}

async function writeCachedGeoLookup(ip: string, data: ResolvedGeoData | null): Promise<void> {
  try {
    const payload = data ? { data } : { miss: true }
    // Negative entries get the shorter TTL so a provider outage is retried sooner
    // than a legitimate no-match result.
    const ttlSeconds = data ? geoCacheTtlSeconds : geoFailureCacheTtlSeconds
    await redis.setex(buildGeoCacheKey(ip), ttlSeconds, JSON.stringify(payload))
  } catch (error) {
    console.warn("Failed to write IP intelligence cache:", error)
  }
}

export async function initializeGeoDatabase(): Promise<void> {
  if (geoInitializationPromise) {
    return geoInitializationPromise
  }

  geoInitializationPromise = Promise.resolve().then(() => undefined)

  return geoInitializationPromise
}

export async function lookupGeoByIp(
  ipInput: string | null | undefined,
  context?: GeoLookupRequestContext
): Promise<ResolvedGeoData | null> {
  const ip = normalizePublicIp(ipInput)
  if (!ip) {
    return null
  }

  const cachedLookup = await readCachedGeoLookup(ip)
  if (cachedLookup.hit) {
    return cachedLookup.data
  }

  // Single-flight: if a sibling path (rate limiter, guest/session enrichment) is
  // already resolving this cold IP, join that call instead of starting a second.
  const inFlight = inflightGeoLookups.get(ip)
  if (inFlight) {
    return inFlight
  }

  const lookup = (async (): Promise<ResolvedGeoData | null> => {
    await initializeGeoDatabase()
    try {
      const resolvedData = ipregistryApiKey ? await fetchIpregistryLookup(ip) : await fetchGeoLookup(ip, context)
      await writeCachedGeoLookup(ip, resolvedData)
      return resolvedData
    } catch (error) {
      console.warn("Failed to resolve IP intelligence from geo API:", error)
      // ponytail: cache the failure so heartbeat-triggered re-enrichment stops hammering a down provider on every write.
      await writeCachedGeoLookup(ip, null).catch(() => undefined)
      return null
    } finally {
      inflightGeoLookups.delete(ip)
    }
  })()

  inflightGeoLookups.set(ip, lookup)
  return lookup
}

// Geo lookup uses the remote ip.deepscrape.dev API.
/* eslint-disable @typescript-eslint/ban-types */
// ponytail: first-touch acquisition captured once at guest creation; no UTM infra needed.
function buildGuestAcquisition(req: Request): Guest["acquisition"] {
  const query = req.query as Record<string, unknown>
  const toText = (value: unknown): string | undefined => {
    const raw = Array.isArray(value) ? value[0] : value
    const text = String(raw ?? "").trim().toLowerCase()
    return text ? text.slice(0, 120) : undefined
  }

  const toHost = (value: unknown): string | undefined => {
    const text = toText(value)
    if (!text) {
      return undefined
    }
    try {
      return new URL(text).hostname || undefined
    } catch {
      return text.slice(0, 120)
    }
  }

  const acquisition = {
    utmSource: toText(query["utm_source"]),
    utmMedium: toText(query["utm_medium"]),
    utmCampaign: toText(query["utm_campaign"]),
    utmTerm: toText(query["utm_term"]),
    utmContent: toText(query["utm_content"]),
    referrer: toHost(req.headers.referer || req.headers.referrer),
    landingPath: String(req.path || "").slice(0, 200) || undefined,
  }

  return Object.values(acquisition).some(Boolean) ? acquisition : undefined
}

// Guest tracking middleware for Express
// Ensures unique guest analytics using fingerprinting and Redis/Firestore

/** Shape of the cached guest liveness record written by `guestTracker`. */
type GuestLastSeenCache = {
  lastSeen?: string
  signedAt?: number
}

/**
 * Whether the cached guest record is recent enough to skip both the Redis
 * refresh and the Firestore read. A record written before `signedAt` existed
 * fails this check, so the first request after deploy writes one and every
 * request after that is a pure cache hit.
 */
const isGuestCacheFresh = (cached: GuestLastSeenCache | null): boolean => {
  if (!cached) {
    return false
  }
  if (typeof cached.signedAt === "number") {
    return Date.now() - cached.signedAt < GUEST_LAST_SEEN_WRITE_INTERVAL_MS
  }
  if (typeof cached.lastSeen === "string") {
    const seenMs = new Date(cached.lastSeen).getTime()
    return Number.isFinite(seenMs) && Date.now() - seenMs < GUEST_LAST_SEEN_WRITE_INTERVAL_MS
  }
  return false
}

export async function guestTracker(req: Request, res: Response, next: NextFunction) {
  let guestId = req.cookies["gid"]
  if (!env.IS_PRODUCTION) {
    console.log("guestTracker: Incoming request - Guest ID from cookie:", guestId, "Headers:", req.headers) // Debug log
  }

  const user = req.app.locals["user"] as string | null
  const isUser = !!user

  // Only track guests, skip if authenticated or has aid cookie
  if (isUser || req.cookies["aid"]) return next()

  // Get IP and fingerprint
  const { raw } = await getClientIps(req)
  const ip = raw as string
  const agent = parseUA(req.headers["user-agent"] || "")
  const fingerstring = `${ip}|${agent.family}|${agent.os.family}|${agent.device.family}`
  // Create SHA-256 hash of the fingerprint for privacy
  const fingerprint = crypto.createHash("sha256").update(fingerstring).digest("hex")
  // One pipeline for both cache probes. This middleware runs on every anonymous
  // request, and the previous shape paid two sequential round-trips plus an
  // unconditional Firestore read for a value that had not changed.
  let existingGuestId: string | null = null
  let cachedGuestSeen: GuestLastSeenCache | null = null
  try {
    const guestProbe = redis.pipeline()
    guestProbe.get(guestFingerprintKey(fingerprint))
    // Only probe the guest key when there is one: an empty key is a REST error, and
    // the whole pipeline failing would discard the fingerprint hit too.
    if (guestId) guestProbe.get(presenceGuestKey(guestId))
    const [fingerprintHit, guestHit] = (await guestProbe.exec()) as [unknown, unknown]
    existingGuestId = typeof fingerprintHit === "string" ? fingerprintHit : null
    cachedGuestSeen = parseCachedJson<GuestLastSeenCache>(guestHit)
  } catch (error) {
    console.warn("guestTracker: Redis unavailable while checking the guest cache", error)
  }
  if (!guestId && existingGuestId) {
    guestId = existingGuestId
    res.cookie("gid", guestId, { httpOnly: false, secure: isProduction, sameSite: "lax", maxAge: 31536000000 })
    // The cache entry is the throttle for both the Redis refresh and the Firestore
    // read: if it is fresh, nothing about this request needs writing at all.
    if (!isGuestCacheFresh(cachedGuestSeen)) {
      const now = new Date()
      try {
        await redis.setex(presenceGuestKey(guestId), PRESENCE_TTL_SECONDS, JSON.stringify({
          lastSeen: now,
          signedAt: now.getTime(),
        }))
      } catch (error) {
        console.warn("guestTracker: Redis unavailable while updating guest lastSeen", error)
      }
      // Update lastSeen in Firestore (throttled)
      const docRef = db.collection("guests").doc(guestId)
      const doc = await docRef.get()
      const docData = doc.exists ? doc.data() as Guest : undefined
      const lastSeen = docData && docData.lastSeen ? new Date(docData.lastSeen) : undefined
      if (!lastSeen || (now.getTime() - lastSeen.getTime() > GUEST_LAST_SEEN_WRITE_INTERVAL_MS)) {
        await docRef.set({ lastSeen: now }, { merge: true })
      }
    }
    return next()
  }

  // If no guestId and no fingerprint mapping, create new guest and store fingerprint
  if (!guestId) {
    guestId = db.collection("guests").doc().id // Generate a new Firestore ID
    // Set secure flag conditionally
    res.cookie("gid", guestId, { httpOnly: false, secure: isProduction, sameSite: "lax", maxAge: 31536000000 }) // 1 year

    const { ipv4, ipv6, raw } = await getClientIps(req) // Prefer IPv6 if available
    const ip = raw as string // Fallback to IPv4 if IPv6 is not available
    const agent = parseUA(req.headers["user-agent"] || "")
    const guestData: Guest = {
      id: guestId,
      uid: "", // Will be set when linked to a user
      ip: { ipv4, ipv6: ipv6 || null, raw },
      userAgent: agent.toString(), // Store full user agent string
      browser: agent.family,
      os: agent.os.family,
      device: agent.device.family,
      // Bot / AI-agent classification drives the bot-free analytics funnel.
      isBot: agent.isBot,
      botKind: agent.botKind,
      language: req.headers["accept-language"]?.split(",")[0] || "en",
      timezone: "UTC",
      country: "Unknown",
      geo: { continent: "Unknown", region: "Unknown" },
      region: "Unknown",
      latitude: 0,
      longitude: 0,
      location: "Unknown",
      acquisition: buildGuestAcquisition(req),
      createdAt: new Date(),
      lastSeen: new Date(),
      fingerprint,
    }
    const guestIntelligenceSeed = {
      intelligenceSourceIp: normalizePublicIp(ip),
      intelligenceStatus: "pending",
      intelligenceUpdatedAt: null,
    }
    req.clientIp = ip
    try {
      await Promise.allSettled([
        redis.setex(
          presenceGuestKey(guestId),
          PRESENCE_TTL_SECONDS,
          JSON.stringify({ ...guestData, ...guestIntelligenceSeed }),
        ),
        // This mapping used to be written with no expiry, so every new IP/UA pair
        // minted a key that never went away. Bounded to match the guest cookie.
        redis.setex(guestFingerprintKey(fingerprint), GUEST_FINGERPRINT_TTL_SECONDS, guestId),
        db.collection("guests").doc(guestId).set({ ...guestData, ...guestIntelligenceSeed }, { merge: true }),
      ])
    } catch (error) {
      console.error("Error storing guest data:", error)
    }
    res.setHeader("Accept-CH", "Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Form-Factors, x-forwarded-for'")
  }
  return next()
}

// API endpoint to receive guest fingerprint data from frontend
export async function guestFingerprintHandler(req: Request, res: Response) {
  try {
    const fingerprintData = req.body
    // Hash the fingerprint for privacy
    const fingerprintString = JSON.stringify(fingerprintData)
    const fingerprintHash = crypto.createHash("sha256").update(fingerprintString).digest("hex")
    // Attach to session or cookie for guest tracking
    res.cookie("guest_fp", fingerprintHash, { httpOnly: false, secure: isProduction, sameSite: "lax", maxAge: 31536000000 })
    res.status(200).json({ success: true, fingerprint: fingerprintHash })
  } catch (error) {
    console.error("guestFingerprintHandler failed:", error)
    res.status(500).json({ success: false, error: "Internal error" })
  }
}

// Standardized analytics event schema
export type AnalyticsEvent = {
  timestamp: number,
  userId?: string,
  guestId?: string,
  eventType: string,
  metadata?: Record<string, string | number | boolean | null>,
  /** Tagged at ingress from the request UA, so the drain can filter bots. */
  isBot?: boolean,
  botKind?: string | null,
}

// Bounded client-event ingress: the drain processes CLIENT_EVENT_MAX per run and
// the list is hard-capped, so a stalled drain can never grow Redis forever.
// The caps live in src/config/redis-keys.ts and are re-exported here for callers
// that already import them from this module.
export { CLIENT_EVENT_LIST_MAX, CLIENT_EVENT_MAX }

// ponytail: trust boundary — client metadata is reduced to short scalars before it
// reaches Redis or Firestore, so a hostile payload cannot bloat either store.
const sanitizeMetadata = (metadata: unknown): Record<string, string | number | boolean | null> => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {}
  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>)
      .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
      .slice(0, CLIENT_EVENT_PROP_MAX)
      .map(([key, value]) => [
        String(key).slice(0, 60),
        typeof value === "string" ? value.slice(0, 200) : value as string | number | boolean | null,
      ]),
  )
}

export const toClientEvent = (body: unknown, ua: ReturnType<typeof parseUA>): AnalyticsEvent => {
  const raw = (body || {}) as { eventType?: unknown, event?: unknown, userId?: unknown, guestId?: unknown, metadata?: unknown, properties?: unknown }
  return {
    timestamp: Date.now(),
    // ponytail: clients have shipped both shapes (`eventType`/`metadata` and
    // `event`/`properties`). Accept either here so a mismatch cannot silently land
    // as `unknown` with empty props — this is the boundary all clients route through.
    eventType: String(raw.eventType ?? raw.event ?? "unknown").replace(/[^\w-]/g, "_").slice(0, 60),
    userId: typeof raw.userId === "string" ? raw.userId.slice(0, 128) : undefined,
    guestId: typeof raw.guestId === "string" ? raw.guestId.slice(0, 128) : undefined,
    isBot: ua.isBot,
    botKind: ua.botKind,
    metadata: sanitizeMetadata(raw.metadata ?? raw.properties),
  }
}

/**
 * Append client events and enforce the hard ingress cap in the same pipeline.
 *
 * The cap used to be applied only by the 30-minute drain. Between drains the list
 * grew with traffic, so a stalled or slow drain could push Redis memory into
 * eviction. One LPUSH + LTRIM per request keeps the list bounded at all times.
 *
 * LPUSH prepends, so `0..MAX-1` retains the newest MAX entries.
 */
const appendClientEvents = async (events: string[]): Promise<number> => {
  const pipeline = redis.pipeline()
  pipeline.lpush(ANALYTICS_EVENTS_KEY, ...events)
  pipeline.ltrim(ANALYTICS_EVENTS_KEY, 0, CLIENT_EVENT_LIST_MAX - 1)
  const [, length] = (await pipeline.exec()) as [number, string]
  return Number(length)
}

// API endpoint to receive analytics events from frontend
export async function analyticsEventHandler(req: Request, res: Response) {
  try {
    const event = toClientEvent(req.body, parseUA(req.headers["user-agent"] || ""))
    await appendClientEvents([JSON.stringify(event)])
    res.status(200).json({ success: true })
  } catch (error) {
    console.warn("analyticsEventHandler: Redis unavailable, dropping event", error)
    res.status(202).json({ success: false, accepted: false })
  }
}

export async function batchAnalyticsEventHandler(req: Request, res: Response) {
  try {
    const { events } = req.body
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "No events provided" })
    }
    // Bound the batch as well as the list: one request could otherwise carry an
    // unbounded array and force a single oversized Redis command.
    if (events.length > CLIENT_EVENT_LIST_MAX) {
      return res.status(413).json({ error: "Batch too large" })
    }
    const ua = parseUA(req.headers["user-agent"] || "")
    const analyticsEvents = events.map((event) => JSON.stringify(toClientEvent(event, ua)))
    await appendClientEvents(analyticsEvents)
    return res.status(200).json({ success: true, processed: analyticsEvents.length })
  } catch (err) {
    console.error("Batch analytics error:", err)
    return res.status(500).json({ error: "Failed to process batch analytics events" })
  }
}

// ponytail: collapse identifier-ish segments so a per-day page counter cannot
// explode on /session/{id} style routes (Firestore docs have a 1MB field budget).
const ID_SEGMENT = /^(\d+|[0-9a-f]{8,}|[0-9a-f-]{16,})$/i
const normalizePagePath = (value: unknown): string | null => {
  if (typeof value !== "string" || !value) return null
  const path = value.split("?")[0]
    .split("/")
    .map((segment) => (segment.length > 24 || ID_SEGMENT.test(segment) ? ":id" : segment))
    .join("/")
    .slice(0, 120)
  return path || "/"
}

/**
 * Drain the client-event list into the `analytics_events` fact table.
 * Runs from the existing 30-minute scheduled function — no extra cloud function.
 *
 * ponytail: atomic `LPOP key count` instead of read-then-trim — a concurrent push
 * would shift the list and re-drain (duplicate) the same events.
 */
export async function drainClientAnalyticsEvents(): Promise<number> {
  try {
    const pending = await redis.lpop<string[]>(ANALYTICS_EVENTS_KEY, CLIENT_EVENT_MAX)
    if (!pending || !pending.length) return 0

    const batch = db.batch()
    const counters: Record<string, Record<string, number>> = {}

    for (const entry of pending) {
      const parsed = (typeof entry === "string" ? JSON.parse(entry) : entry) as AnalyticsEvent
      const event = buildAnalyticsEvent({
        name: parsed.eventType || "unknown",
        ts: new Date(Number(parsed.timestamp) || Date.now()),
        uid: parsed.userId,
        guestId: parsed.guestId,
        isBot: parsed.isBot,
        botKind: parsed.botKind,
        props: sanitizeMetadata(parsed.metadata),
      })
      batch.set(db.collection(ANALYTICS_EVENTS).doc(), event)

      const day = counters[event.date] || (counters[event.date] = {})
      // ponytail: bots are kept as facts but excluded from every counter — the same
      // rule as the funnel, so pageviews and client-event counts stay human.
      if (event.isBot) continue

      day[`clientEvents.${event.name}`] = (day[`clientEvents.${event.name}`] || 0) + 1

      const page = normalizePagePath(event.props.page ?? event.props.path)
      if (page) {
        const pageKey = page.replace(/\./g, "_")
        day[`byPage.${pageKey}`] = (day[`byPage.${pageKey}`] || 0) + 1
      }
    }

    for (const [date, keys] of Object.entries(counters)) {
      batch.set(db.doc(`metrics_daily/${date}`), Object.fromEntries(
        Object.entries(keys).map(([key, count]) => [key, FieldValue.increment(count)]),
      ), { merge: true })
    }

    await batch.commit()
    // Safety cap: keep the newest CLIENT_EVENT_LIST_MAX entries if the drain falls behind.
    await redis.ltrim(ANALYTICS_EVENTS_KEY, 0, CLIENT_EVENT_LIST_MAX - 1)
    console.log(`✅ Drained ${pending.length} client analytics events`)
    return pending.length
  } catch (error) {
    console.warn("drainClientAnalyticsEvents failed:", error)
    return 0
  }
}

async function getClientIps(req: Request): Promise<{ ipv4: string | null, ipv6: string | null, raw: string | null }> {
  const raw = req.headers["x-forwarded-for"] || req.connection.remoteAddress || null

  let rawIp = getClientIp(req) || ""

  // Normalize IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (rawIp.startsWith("::ffff:")) {
    rawIp = rawIp.substring(7)
  }

  let ipv4 = null
  let ipv6 = null

  if (net.isIPv4(rawIp)) {
    ipv4 = rawIp
  } else if (net.isIPv6(rawIp)) {
    // Special case: localhost "::1" → treat as IPv6
    ipv6 = rawIp
  }
  console.log("Detected IPs - IPv4:", ipv4, "IPv6:", ipv6, "Raw:", raw)
  return { ipv4, ipv6, raw: getClientIp(req) }
}

