/* eslint-disable valid-jsdoc */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Advanced Upstash Ratelimit SDK for Firebase Functions
 * Features:
 * - Auto IP deny lists (blocks malicious IPs from 30+ sources)
 * - Country/User-Agent blocking
 * - Analytics dashboard
 * - enableProtection: true for advanced protection
 */

import {Request, Response, NextFunction} from "express"
import {Ratelimit} from "@upstash/ratelimit"
import {env} from "../config/env"
import {redis as sharedRedis, isRedisEnabled} from "../app/cacheConfig"
import {lookupGeoByIp} from "../gfunctions/analytics"

const sanitizeUpstashRestUrl = (value: string): string => {
  if (!value) {
    return ""
  }

  try {
    const parsed = new URL(value)
    if (parsed.hostname.endsWith(".upstash.io.upstash.io")) {
      parsed.hostname = parsed.hostname.replace(/\.upstash\.io\.upstash\.io$/, ".upstash.io")
      return parsed.toString().replace(/\/$/, "")
    }
    return value
  } catch {
    return value
      .trim()
      .replace(/\.upstash\.io\.upstash\.io(?=$|\/)/, ".upstash.io")
  }
}

const isEncryptedPlaceholder = (value: string): boolean =>
  /^encrypted:/i.test((value || "").trim())

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

const upstashUrl = sanitizeUpstashRestUrl(env.UPSTASH_REDIS_REST_URL)
const upstashToken = env.UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_PASSWORD
const shouldEnableUpstashRateLimit =
  isRedisEnabled &&
  !!upstashUrl &&
  !!upstashToken &&
  isHttpUrl(upstashUrl) &&
  !isEncryptedPlaceholder(upstashUrl) &&
  !isEncryptedPlaceholder(upstashToken)
  /* ( !isFunctionsEmulator ||  ) */
if (!shouldEnableUpstashRateLimit && env.PRODUCTION === "true") {
  console.error(
    "upstash-limiter: DISABLED. No shared Redis client, so rate limiting and IP/country " +
    "deny-lists are inactive on this path.",
  )
}

// Reuse the one process-wide REST client instead of constructing a second one
// with its own credential parsing.
const redis = shouldEnableUpstashRateLimit ? (sharedRedis as unknown as Record<string, unknown>) : null

/**
 * Firebase Functions rate limiter, scaled by billing tier.
 * Development: 1 min window, 50 requests. Production: 15 min window, 100.
 * Paid tiers multiply the base cap; roles come from the Firebase `role` claim.
 */
const TIER_MULTIPLIERS: Record<string, number> = {
  free: 1,
  pro: 3,
  enterprise: 8,
  admin: 20,
}
const baseFunctionMax = env.PRODUCTION === "true" ? 100 : 50

const functionRatelimits: Record<string, Ratelimit | null> = Object.fromEntries(
  Object.entries(TIER_MULTIPLIERS).map(([tier, multiplier]) => [
    tier,
    shouldEnableUpstashRateLimit ? new Ratelimit({
      redis: redis as any,
      limiter: Ratelimit.slidingWindow(
        Math.max(1, Math.floor(baseFunctionMax * multiplier)),
        env.PRODUCTION === "true" ? "15 m" : "1 m"
      ),
      analytics: env.PRODUCTION === "true",
      enableProtection: env.PRODUCTION === "true",
      prefix: `functionsRateLimit:${tier}`,
    }) : null,
  ])
)
const functionRatelimit = functionRatelimits.free

/**
 * Strict limiter for authentication / account-verification endpoints.
 * Tighter than the general limiter to blunt credential stuffing, brute force,
 * and phone/email enumeration. Same cap for every tier on purpose.
 */
const authRatelimit = shouldEnableUpstashRateLimit ? new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(
    env.PRODUCTION === "true" ? 10 : 50,
    env.PRODUCTION === "true" ? "15 m" : "1 m"
  ),
  analytics: env.PRODUCTION === "true",
  enableProtection: env.PRODUCTION === "true",
  prefix: "authRateLimit",
}) : null

/**
 * Analytics/events limiter
 * Uses the same window but disables automatic deny-list protection
 * to avoid false-positive 403s on high-volume client telemetry.
 */
const eventRatelimit = shouldEnableUpstashRateLimit ? new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(
    env.PRODUCTION === "true" ? 100 : 50,
    env.PRODUCTION === "true" ? "15 m" : "1 m"
  ),
  analytics: env.PRODUCTION === "true",
  enableProtection: false,
  prefix: "eventRateLimit",
}) : null

/**
 * Best-effort country code for deny-list / dashboard analytics.
 * Cheap edge headers first; falls back to the shared Redis-cached geo lookup
 * (ipregistry when IPREGISTRY_API_KEY is set). Cached 6h, so only first-seen
 * IPs ever hit the provider. Lookups are skipped on the event limiter
 * (enableProtection=false) where country only feeds analytics, never a block.
 */
async function resolveCountryCode(
  req: Request,
  ip: string,
  allowDenyListBlock: boolean
): Promise<string> {
  const edgeCountry = req.get("x-country") || req.get("cf-ipcountry")
  if (edgeCountry) {
    return edgeCountry
  }
  if (!allowDenyListBlock) {
    return "unknown"
  }
  try {
    const geo = await lookupGeoByIp(ip)
    return geo?.countryShort || "unknown"
  } catch {
    return "unknown"
  }
}

/**
 * Normalize the `role` custom claim to a known tier key, defaulting to "free".
 * @param {unknown} role The authenticated user's role claim.
 * @return {string} One of TIER_MULTIPLIERS' keys.
 */
const resolveTier = (role: unknown): string => {
  const normalized = typeof role === "string" ? role.trim().toLowerCase() : ""
  if (!normalized) {
    return "free"
  }
  // Longest / most specific first: an "enterprise_admin" is an admin.
  if (normalized.includes("admin")) {
    return "admin"
  }
  if (normalized.includes("enterprise")) {
    return "enterprise"
  }
  if (normalized.includes("pro")) {
    return "pro"
  }
  return "free"
}

async function applyRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  ratelimit: Ratelimit | null,
  allowDenyListBlock = true,
  tiered = false
): Promise<Response | void> {
  // Paid tiers get a bigger budget; the limiter instance carries the cap.
  let effectiveRatelimit = ratelimit
  if (tiered) {
    effectiveRatelimit = functionRatelimits[resolveTier(req.user?.role)]
  }

  if (!shouldEnableUpstashRateLimit || !effectiveRatelimit) {
    return next()
  }

  // Skip rate limiting for health checks
  if (req.path === "/health" || req.path === "/ping" || req.path === "/") {
    return next()
  }

  try {
    // Extract client IP
    const ip = req.ip || req.socket?.remoteAddress || "unknown"
    const userAgent = req.get("user-agent") || "unknown"

    // Use user UID if authenticated, otherwise use IP
    const identifier = req.user?.uid || ip

    // Best-effort country for deny-list checks (edge headers, then Redis-cached geo).
    const country = await resolveCountryCode(req, ip, allowDenyListBlock)

    // Apply rate limit with protection
    const {success, limit, remaining, reset, pending, reason} = await effectiveRatelimit.limit(
      identifier,
      {
        ip, // For auto IP deny list
        userAgent, // For user-agent based blocking
        country, // For country-based blocking
      }
    )

    // Wait for analytics to complete if pending
    if (pending) {
      await pending
    }

    // Set rate limit headers
    res.set("RateLimit-Limit", limit.toString())
    res.set("RateLimit-Remaining", Math.max(0, remaining).toString())
    res.set("RateLimit-Reset", new Date(reset).toISOString())

    if (!success) {
      const resetSec = Math.ceil((reset - Date.now()) / 1000)
      const minutes = Math.floor(resetSec / 60)
        .toString()
        .padStart(2, "0")
      const seconds = (resetSec % 60).toString().padStart(2, "0")
      res.set("Retry-After", resetSec.toString())

      // If blocked by deny list
      if (allowDenyListBlock && reason === "denyList") {
        return res.status(403).set("Content-Type", "text/html").send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 Access Denied</title>
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin />
    <link rel="stylesheet" nonce="${res.locals["nonce"]}" href="https://fonts.googleapis.com/css2?display=swap&family=Inter:wght@400;500;700;900&family=Noto+Sans:wght@400;500;700;900" />
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  </head>
  <body class="relative min-h-screen w-full bg-white flex flex-col items-center justify-center font-['Inter','Noto Sans',sans-serif] overflow-x-hidden">
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <span class="text-[16vw] font-black text-gray-200 opacity-40">403</span>
    </div>
    <div class="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center justify-center py-10">
      <h2 class="text-[#111318] text-3xl md:text-4xl font-bold leading-tight text-center pb-3 pt-5">Access Denied</h2>
      <p class="text-[#111318] text-base font-normal leading-normal pb-3 pt-1 text-center">
        Your IP address has been blocked due to suspicious activity. Please contact support if you believe this is an error.<br>
        <span class="text-red-600 font-semibold">Reason: Security Policy Violation</span>
      </p>
      <div class="flex gap-4 py-6 justify-center">
        <button class="flex min-w-[84px] max-w-xs cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-[#195de6] text-white text-sm font-bold hover:bg-blue-700" onclick="window.location.href='/'>
          <span>Go Home</span>
        </button>
      </div>
    </div>
  </body>
</html>
        `)
      }

      // Standard rate limit exceeded
      return res.status(429).set("Content-Type", "text/html").send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>429 Too Many Requests</title>
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin />
    <link rel="stylesheet" nonce="${res.locals["nonce"]}" href="https://fonts.googleapis.com/css2?display=swap&family=Inter:wght@400;500;700;900&family=Noto+Sans:wght@400;500;700;900" />
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  </head>
  <body class="relative min-h-screen w-full bg-white flex flex-col items-center justify-center font-['Inter','Noto Sans',sans-serif] overflow-x-hidden">
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <span class="text-[16vw] font-black text-gray-200 opacity-40">429</span>
    </div>
    <div class="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center justify-center py-10">
      <h2 class="text-[#111318] text-3xl md:text-4xl font-bold leading-tight text-center pb-3 pt-5">Too Many Requests</h2>
      <p class="text-[#111318] text-base font-normal leading-normal pb-3 pt-1 text-center">
        You've sent too many requests in a short period. Please wait before trying again.<br>
        <span class="text-blue-600 font-semibold">Retry-After: ${minutes}:${seconds} minutes</span>
      </p>
      <div class="flex gap-4 py-6 justify-center">
        <div class="flex flex-col items-center">
          <div class="flex h-14 w-16 items-center justify-center rounded-lg bg-[#f0f2f4]">
            <p class="text-[#111318] text-lg font-bold">00</p>
          </div>
          <p class="text-[#111318] text-sm">Hours</p>
        </div>
        <div class="flex flex-col items-center">
          <div class="flex h-14 w-16 items-center justify-center rounded-lg bg-[#f0f2f4]">
            <p class="text-[#111318] text-lg font-bold">${minutes}</p>
          </div>
          <p class="text-[#111318] text-sm">Minutes</p>
        </div>
        <div class="flex flex-col items-center">
          <div class="flex h-14 w-16 items-center justify-center rounded-lg bg-[#f0f2f4]">
            <p class="text-[#111318] text-lg font-bold">${seconds}</p>
          </div>
          <p class="text-[#111318] text-sm">Seconds</p>
        </div>
      </div>
      <button class="flex min-w-[84px] max-w-xs cursor-not-allowed items-center justify-center rounded-lg h-10 px-4 bg-[#195de6] text-white text-sm font-bold opacity-70" disabled>
        <span>Try Again Later</span>
      </button>
    </div>
  </body>
</html>
      `)
    }

    next()
  } catch (error) {
    console.error("Function rate limit error:", error)
    // On error, allow request but log it
    next()
  }
}

/**
 * Express middleware for Firebase Functions rate limiting
 * @param {any} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export async function upstashFunctionLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  return applyRateLimit(req, res, next, functionRatelimit, true, true)
}

export async function upstashEventLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  return applyRateLimit(req, res, next, eventRatelimit, false)
}

/**
 * Strict limiter for auth endpoints: login, phone/email verification, and the
 * enumeration-sensitive lookups. One cap regardless of tier.
 * @param {Request} req Express request.
 * @param {Response} res Express response.
 * @param {NextFunction} next Express next middleware.
 * @return {Promise<Response | void>} Resolves after the limit check.
 */
export async function upstashAuthLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  return applyRateLimit(req, res, next, authRatelimit, true)
}

export {functionRatelimit}
