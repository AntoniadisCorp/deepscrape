/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
import { Request, Response, NextFunction } from "express"
import { getClientIp } from "request-ip"
import useragent from "useragent"
import { Guest } from "../domain"
import { redis } from "../app/cacheConfig"
import { db } from "../app/config"
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
const geoCacheTtlSeconds = 60 * 60 * 6
const GEO_CACHE_PREFIX = "ipintel:v2:"

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
  return `${GEO_CACHE_PREFIX}${digest}`
}

async function readCachedGeoLookup(ip: string): Promise<CachedGeoLookup> {
  try {
    const cached = await redis.get(buildGeoCacheKey(ip))
    if (typeof cached !== "string" || !cached) {
      return { hit: false, data: null }
    }

    const parsed = JSON.parse(cached) as { miss?: boolean; data?: ResolvedGeoData | null }
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
    await redis.setex(buildGeoCacheKey(ip), geoCacheTtlSeconds, JSON.stringify(payload))
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
  }
}

// Geo lookup uses the remote ip.deepscrape.dev API.
/* eslint-disable @typescript-eslint/ban-types */
// Guest tracking middleware for Express
// Ensures unique guest analytics using fingerprinting and Redis/Firestore
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
  const agent = useragent.parse(req.headers["user-agent"] || "")
  const fingerstring = `${ip}|${agent.family}|${agent.os.family}|${agent.device.family}`
  // Create SHA-256 hash of the fingerprint for privacy
  const fingerprint = crypto.createHash("sha256").update(fingerstring).digest("hex")
  // Always check Redis for fingerprint mapping
  let existingGuestId: string | null = null
  try {
    existingGuestId = await redis.get(`guestfp:${fingerprint}`)
  } catch (error) {
    console.warn("guestTracker: Redis unavailable while checking fingerprint mapping", error)
  }
  if (!guestId && existingGuestId) {
    guestId = existingGuestId
    res.cookie("gid", guestId, { httpOnly: false, secure: isProduction, sameSite: "lax", maxAge: 31536000000 })
    // Update lastSeen in Redis
    try {
      await redis.setex(`guest:${guestId}`, 3600, JSON.stringify({ lastSeen: new Date() }))
    } catch (error) {
      console.warn("guestTracker: Redis unavailable while updating guest lastSeen", error)
    }
    // Update lastSeen in Firestore (throttled)
    const docRef = db.collection("guests").doc(guestId)
    const doc = await docRef.get()
    const docData = doc.exists ? doc.data() as Guest : undefined
    const lastSeen = docData && docData.lastSeen ? new Date(docData.lastSeen) : undefined
    const now = new Date()
    if (!lastSeen || (now.getTime() - lastSeen.getTime() > 300000)) {
      await docRef.set({ lastSeen: now }, { merge: true })
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
    const agent = useragent.parse(req.headers["user-agent"] || "")
    const guestData: Guest = {
      id: guestId,
      uid: "", // Will be set when linked to a user
      ip: { ipv4, ipv6: ipv6 || null, raw },
      userAgent: agent.toString(), // Store full user agent string
      browser: agent.family,
      os: agent.os.family,
      device: agent.device.family,
      language: req.headers["accept-language"]?.split(",")[0] || "en",
      timezone: "UTC",
      country: "Unknown",
      geo: { continent: "Unknown", region: "Unknown" },
      region: "Unknown",
      latitude: 0,
      longitude: 0,
      location: "Unknown",
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
        redis.setex(`guest:${guestId}`, 3600, JSON.stringify({ ...guestData, ...guestIntelligenceSeed })),
        redis.set(`guestfp:${fingerprint}`, guestId),
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
    const errorMsg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: errorMsg })
  }
}

// Standardized analytics event schema
export type AnalyticsEvent = {
  timestamp: number,
  userId?: string,
  guestId?: string,
  eventType: string,
  metadata?: Record<string, unknown>,
}

// API endpoint to receive analytics events from frontend
export async function analyticsEventHandler(req: Request, res: Response) {
  try {
    const event: AnalyticsEvent = {
      timestamp: Date.now(),
      ...req.body,
    }
    // Store event in Redis list for batching
    await redis.lpush("analytics:events", JSON.stringify(event))
    res.status(200).json({ success: true })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.warn("analyticsEventHandler: Redis unavailable, dropping event", error)
    res.status(202).json({ success: false, accepted: false, error: errorMsg })
  }
}

export async function batchAnalyticsEventHandler(req: Request, res: Response) {
  try {
    const { events } = req.body
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "No events provided" })
    }
    const analyticsEvents = events.map((event) => JSON.stringify({
      timestamp: Date.now(),
      ...event,
    }))
    await redis.lpush("analytics:events", ...analyticsEvents)
    return res.status(200).json({ success: true, processed: analyticsEvents.length })
  } catch (err) {
    console.error("Batch analytics error:", err)
    return res.status(500).json({ error: "Failed to process batch analytics events" })
  }
}

// Batch sync function (to be called by background job/Cloud Function)
export async function batchSyncAnalyticsEvents() {
  try {
    // Get all events from Redis
    const events = await redis.lrange("analytics:events", 0, -1)
    if (!events.length) return
    // Prepare batch write to Firestore
    const batch = db.batch()
    events.forEach((eventStr: string) => {
      const event = JSON.parse(eventStr)
      const ref = db.collection("analyticsEvents").doc()
      batch.set(ref, event)
    })
    await batch.commit()
    // Clear Redis list after sync
    await redis.del("analytics:events")
    console.log(`Synced ${events.length} analytics events to Firestore.`)
  } catch (error) {
    console.error("Error syncing analytics events:", error)
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

