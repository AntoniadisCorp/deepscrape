/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
import IP2Location from "ip2location-nodejs"
import { Request, Response, NextFunction } from "express"
import { getClientIp } from "request-ip"
import useragent from "useragent"
import { Guest, UserDetails } from "../domain"
import { redis } from "../app/cacheConfig"
import { db } from "../app/config"
import path from "node:path"
import net from "node:net"
import crypto from "crypto"
import { existsSync, createReadStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import { env } from "../config/env"
import * as admin from "firebase-admin"

// Determine if running in production based on environment variable
const isProduction = env.IS_PRODUCTION

// Class to manage IP2Location database connection
// https://github.com/onramper/fast-geoip is a faster alternative but less detailed
// https://www.npmjs.com/package/geoip-lite is another alternative but less accurate
// https://www.npmjs.com/package/maxmind is a commercial alternative but more accurate
// https://www.npmjs.com/package/ip2location-nodejs is a good balance between accuracy and performance
// https://www.ip2location.com/developers/nodejs
// https://www.ip2location.com/databases/db11-ip-country-region-city
// https://www.ip2location.com/databases/db11-ip-country
// https://www.ip2location.com/databases/db11-ip-country-region-city-isp-domain
// https://www.ip2location.com/databases/db11-ip-country-region-city-isp-domain-netspeed
// https://www.ip2location.com/databases/db11-ip-country-region-city-isp-domain-netspeed-usage
// https://www.ip2location.com/databases/db11-ip-country-region-city-isp-domain-netspeed-usage-elevation
// The LITE version is free and updated monthly, the commercial version is updated weekly and has more data fields
// The BIN database file should be placed in the 'databases' folder at the root of the project

export type IP2LocationRecord = {
  ip: string,
  ipNo: string,
  countryShort: string,
  countryLong: string,
  region: string,
  city: string,
  isp: string,
  domain: string,
  zipCode: string,
  latitude: string | number,
  longitude: string | number,
  timeZone: string,
  netSpeed: string,
  iddCode: string,
  areaCode: string,
  weatherStationCode: string,
  weatherStationName: string,
  mcc: string,
  mnc: string,
  mobileBrand: string,
  elevation: string,
  usageType: string,
  addressType: string,
  category: string,
  district: string,
  asn: string,
  as: string,
}
export class IP2LocationManager {
  private ip2location: IP2Location.IP2Location | null = null
  private databasePath: string

  constructor(databasePath: string) {
    this.databasePath = databasePath
  }

  setDatabasePath(databasePath: string): void {
    this.databasePath = databasePath
  }

  // Initialize and open the database
  async open(): Promise<void> {
    try {
      if (this.ip2location) {
        console.log("Database already open")
        return
      }

      this.ip2location = new IP2Location.IP2Location()
      this.ip2location.open(this.databasePath)
      console.log(`Successfully opened IP2Location database: ${this.databasePath}`)
    } catch (error) {
      console.error("Failed to open IP2Location database:", error)
      throw new Error("Database initialization failed")
    }
  }

  // Get the IP2Location instance (throws if not initialized)
  getInstance(): IP2Location.IP2Location {
    if (!this.ip2location) {
      throw new Error("IP2Location database not initialized")
    }
    return this.ip2location
  }

  // Close the database
  close(): void {
    try {
      if (this.ip2location) {
        this.ip2location.close()
        console.log("Successfully closed IP2Location database")
        this.ip2location = null // Clear instance
      }
    } catch (error) {
      console.error("Error closing IP2Location database:", error)
    }
  }
}

// Initialize IP2Location Manager with the database path
const databaseFile = "IP2LOCATION-LITE-DB11.BIN"
const databaseCandidates = [
  path.join(__dirname, "../../databases", databaseFile),
  path.join(__dirname, "../../../databases", databaseFile),
]
const resolvedDatabasePath = databaseCandidates.find((candidate) => existsSync(candidate)) || databaseCandidates[0]
export const geoDBManager = new IP2LocationManager(resolvedDatabasePath)
const tmpDatabaseDir = path.join("/tmp", "ip2location")
const tmpDatabasePath = path.join(tmpDatabaseDir, databaseFile)

let geoInitializationPromise: Promise<void> | null = null

type ParsedGcsPath = {
  bucket: string,
  objectPath: string,
}

function parseGcsPath(input: string): ParsedGcsPath | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith("gs://")) {
    const withoutScheme = trimmed.replace(/^gs:\/\//, "")
    const slashIndex = withoutScheme.indexOf("/")
    if (slashIndex <= 0) {
      return null
    }

    const bucket = withoutScheme.slice(0, slashIndex)
    const objectPath = withoutScheme.slice(slashIndex + 1)
    if (!bucket || !objectPath) {
      return null
    }

    return { bucket, objectPath }
  }

  const slashIndex = trimmed.indexOf("/")
  if (slashIndex <= 0) {
    return null
  }

  const bucket = trimmed.slice(0, slashIndex)
  const objectPath = trimmed.slice(slashIndex + 1)
  if (!bucket || !objectPath) {
    return null
  }

  return { bucket, objectPath }
}

async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    const stream = createReadStream(filePath)

    stream.on("error", reject)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
  })
}

async function resolveDatabasePath(): Promise<string> {
  const expectedChecksum = env.IP2LOCATION_SHA256.trim().toLowerCase()
  const gcsPath = env.IP2LOCATION_GCS_PATH.trim()

  if (!gcsPath) {
    return resolvedDatabasePath
  }

  const parsed = parseGcsPath(gcsPath)
  if (!parsed) {
    throw new Error(`Invalid IP2LOCATION_GCS_PATH value: ${gcsPath}`)
  }

  await mkdir(tmpDatabaseDir, { recursive: true })

  const localTmpExists = existsSync(tmpDatabasePath)
  if (localTmpExists && !expectedChecksum) {
    return tmpDatabasePath
  }

  if (localTmpExists && expectedChecksum) {
    const currentChecksum = (await computeSha256(tmpDatabasePath)).toLowerCase()
    if (currentChecksum === expectedChecksum) {
      return tmpDatabasePath
    }
  }

  const bucket = admin.storage().bucket(parsed.bucket)
  await bucket.file(parsed.objectPath).download({ destination: tmpDatabasePath })

  if (expectedChecksum) {
    const downloadedChecksum = (await computeSha256(tmpDatabasePath)).toLowerCase()
    if (downloadedChecksum !== expectedChecksum) {
      throw new Error("Downloaded IP2Location BIN checksum mismatch")
    }
  }

  return tmpDatabasePath
}

export async function initializeGeoDatabase(): Promise<void> {
  if (geoInitializationPromise) {
    return geoInitializationPromise
  }

  geoInitializationPromise = (async () => {
    const databasePath = await resolveDatabasePath()
    geoDBManager.setDatabasePath(databasePath)
    await geoDBManager.open()
  })().catch((error) => {
    geoInitializationPromise = null
    throw error
  })

  return geoInitializationPromise
}


// Helper function to map timezone to continent
function getContinentFromTimezone(timezone: string): string {
  if (!timezone) return "Unknown"
  if (timezone.startsWith("Europe/")) return "Europe"
  if (timezone.startsWith("Asia/")) return "Asia"
  if (timezone.startsWith("America/")) return "North America"
  if (timezone.startsWith("Africa/")) return "Africa"
  if (timezone.startsWith("Australia/") || timezone.startsWith("Pacific/")) return "Oceania"
  if (timezone.startsWith("Antarctica/")) return "Antarctica"
  return "Unknown"
}


// IP2LOCATION-LITE-DB11.BIN
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
    const geo = await getGeolocation(ip)
    const guestData: Guest = {
      id: guestId,
      uid: "", // Will be set when linked to a user
      ip: { ipv4, ipv6: ipv6 || null, raw },
      userAgent: agent.toString(), // Store full user agent string
      browser: agent.family,
      os: agent.os.family,
      device: agent.device.family,
      language: geo.language || req.headers["accept-language"]?.split(",")[0] || "en",
      timezone: geo.timezone || "UTC", // Use timezone from geo if available
      country: geo.country || "Unknown",
      geo: geo.geo || { continent: "Unknown", region: "Unknown" },
      region: geo.region || "Unknown",
      latitude: geo.latitude || 0,
      longitude: geo.longitude || 0,
      location: geo.location || "Unknown",
      createdAt: new Date(),
      lastSeen: new Date(),
      fingerprint,
    }
    req.clientIp = ip
    try {
      await Promise.allSettled([
        redis.setex(`guest:${guestId}`, 3600, JSON.stringify(guestData)),
        redis.set(`guestfp:${fingerprint}`, guestId),
        db.collection("guests").doc(guestId).set(guestData, { merge: true }),
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

// Refactored getGeolocation function
async function getGeolocation(ip: string) {
  try {
    // Get the IP2Location instance
    const ip2location = geoDBManager.getInstance()

    // Perform IP lookup (synchronous, wrapped in Promise)
    const geoData = await new Promise<IP2LocationRecord>((resolve, reject) => {
      try {
        const result = ip2location.getAll(ip)
        if (result && result["countryShort"] !== "INVALID IP ADDRESS") {
          resolve(result)
        } else {
          reject(new Error("Invalid IP address"))
        }
      } catch (error) {
        reject(error)
      }
    })

    // Emulate browser language and timezone (Node.js context)
    // In a browser, use navigator.language and Intl.DateTimeFormat directly
    const language = typeof navigator !== "undefined" ? navigator.language || "en" : "en"
    const timezone =
      typeof Intl !== "undefined" ?
        new Intl.DateTimeFormat().resolvedOptions().timeZone :
        "UTC"

    // Map country code to continent (fallback to 'Unknown' if not found)
    const continent = { continent: getContinentFromTimezone(geoData.timeZone) || "Unknown", region: geoData.countryShort || "Unknown" }

    return {
      ip: geoData.ip,
      geo: { ...continent },
      country: geoData.countryLong || "Unknown",
      location: geoData.city || "Unknown",
      region: geoData.region || "Unknown",
      latitude: parseFloat(geoData.latitude.toString()),
      longitude: parseFloat(geoData.longitude.toString()),
      language,
      timezone,
    } as Pick<UserDetails, "geo" | "country" | "location" | "region" | "latitude" | "longitude" | "language" | "timezone">
  } catch (error) {
    console.error("Error fetching geolocation details:", error)
    return {}
  }
}
