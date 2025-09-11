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

// Determine if running in production based on environment variable
const isProduction = process.env["PRODUCTION"] === "true"

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

export type IP2LocationRecord ={
        ip: string
        ipNo: string
        countryShort: string
        countryLong: string
        region: string
        city: string
        isp: string
        domain: string
        zipCode: string
        latitude: string | number
        longitude: string | number
        timeZone: string
        netSpeed: string
        iddCode: string
        areaCode: string
        weatherStationCode: string
        weatherStationName: string
        mcc: string
        mnc: string
        mobileBrand: string
        elevation: string
        usageType: string
        addressType: string
        category: string
        district: string
        asn: string
        as: string
    }
export class IP2LocationManager {
  private ip2location: IP2Location.IP2Location | null = null
  private databasePath: string

  constructor(databasePath: string) {
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
const databaseDir = path.join(__dirname, "../../databases")
const databaseFile = "IP2LOCATION-LITE-DB11.BIN"
export const geoDBManager = new IP2LocationManager(path.join(databaseDir, databaseFile))


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
export async function guestTracker(req: Request, res: Response, next: NextFunction) {
  let guestId = req.cookies["gid"]
  const user = req.app.locals["user"] as string | null
  const isUser = !!user

  console.log("Guest Tracker Invoked - Guest ID:", guestId, "User:", user)

  if (isUser || req.cookies["aid"]) {
    // TODO: Update the user's geo details in Firestore if logged in
    // If 'aid' cookie exists, skip guest tracking
    // res.status(200).send({ status: true, message: "Authenticated user, skipping guest tracking" })
    return next()
  }

  if (!guestId) {
    guestId = db.collection("guests").doc().id // Generate a new Firestore ID
    // Set secure flag conditionally
    res.cookie("gid", guestId, { httpOnly: false, secure: isProduction, sameSite: "lax", maxAge: 31536000000 }) // 1 year

    const { ipv4, ipv6, raw } = await getClientIps(req) // Prefer IPv6 if available

    const ip = (raw) as string // Fallback to IPv4 if IPv6 is not available
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
    }

    req.clientIp = ip // Attach IP to request object for downstream use

    // Store in Redis (fast access)
    await redis.setex(`guest:${guestId}`, 3600, JSON.stringify(guestData)) // 1 hour expiration

    // Write to Firestore (long-term analytics)
    await db.collection("guests").doc(guestId).set(guestData, { merge: true })

    res.setHeader("Accept-CH", "Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Form-Factors, x-forwarded-for'")

    // res.status(200).send({ status: true, guestId, message: "New guest tracked" })
  } /* else {
    // // Guest already exists, update lastSeen timestamp
    // await db.collection("guests").doc(guestId).update({
    //   lastSeen: new Date(),
    // })
    // res.status(200).send({ status: true, guestId, message: "Guest activity updated" })
  } */
  return next()
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
    const continent = {continent: getContinentFromTimezone(geoData.timeZone) || "Unknown", region: geoData.countryShort || "Unknown"}

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
