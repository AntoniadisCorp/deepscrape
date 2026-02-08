/**
 * Advanced Upstash Ratelimit SDK Integration
 * Features:
 * - Auto IP deny lists (blocks malicious IPs from 30+ sources)
 * - Country/User-Agent blocking
 * - Analytics dashboard
 * - enableProtection: true for advanced protection
 */

import { Request, Response, NextFunction } from "express"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { env } from "../../src/config/env"

// Initialize Upstash Redis and Ratelimit
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

/**
 * General rate limiter for all requests
 * Development: 1 min window, 500 requests
 * Production: 15 min window, 1000 requests
 */
const generalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    env.PRODUCTION === "true" ? 1000 : 500, // max requests
    env.PRODUCTION === "true" ? "15 m" : "1 m" // window
  ),
  analytics: env.PRODUCTION === "true", // Enable analytics in production
  enableProtection: env.PRODUCTION === "true", // Enable auto IP deny list in production
  prefix: "rateLimit", // Redis key prefix
})

/**
 * Stricter rate limiter for API endpoints
 * Development: 1 min window, 50 requests
 * Production: 15 min window, 100 requests
 */
const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    env.PRODUCTION === "true" ? 100 : 50, // max requests
    env.PRODUCTION === "true" ? "15 m" : "1 m" // window
  ),
  analytics: env.PRODUCTION === "true", // Enable analytics in production
  enableProtection: env.PRODUCTION === "true", // Enable auto IP deny list in production
  prefix: "apiRateLimit", // Redis key prefix
})

/**
 * Rate limit middleware using Upstash SDK
 * Includes automatic IP deny list protection
 */
export async function upstashGeneralLimiter(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
  // Skip rate limiting for static assets
  if (req.url.match(/^\/(?:assets|icons|fontawesome|images|svg|webfonts|js|css)\//)) {
    return next()
  }

  // Skip health checks
  if (req.path === "/health" || req.path === "/ping") {
    return next()
  }

  try {
    // Extract client IP
    const ip = req.ip || req.socket.remoteAddress || "unknown"
    const userAgent = req.get("user-agent") || "unknown"

    // Use user UID if authenticated, otherwise use IP
    const identifier = (req as any).user?.uid || ip

    // Apply rate limit with protection
    const { success, limit, remaining, reset, pending, reason } = await generalRatelimit.limit(
      identifier,
      {
        ip, // For auto IP deny list
        userAgent, // For user-agent based blocking
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
      res.set("Retry-After", resetSec.toString())

      // If blocked by deny list
      if (reason === "denyList") {
        return res.status(403).json({
          error: "Access Denied",
          message: "Your IP address has been blocked due to suspicious activity",
          reason: "denyList",
        })
      }

      // Standard rate limit exceeded
      const minutes = Math.floor(resetSec / 60)
        .toString()
        .padStart(2, "0")
      const seconds = (resetSec % 60).toString().padStart(2, "0")

      return res.status(429).send(`
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
    console.error("Rate limit error:", error)
    // On error, allow request but log it
    next()
  }
}

/**
 * Stricter rate limit middleware for API endpoints
 */
export async function upstashApiLimiter(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
  // Skip rate limiting for authentication endpoints
  if (req.path === "/auth" || req.path === "/login" || req.path === "/health") {
    return next()
  }

  try {
    // Extract client IP
    const ip = req.ip || req.socket.remoteAddress || "unknown"
    const userAgent = req.get("user-agent") || "unknown"

    // Use user UID if authenticated, otherwise use IP
    const identifier = (req as any).user?.uid || ip

    // Apply rate limit with protection
    const { success, limit, remaining, reset, pending, reason } = await apiRatelimit.limit(
      identifier,
      {
        ip, // For auto IP deny list
        userAgent, // For user-agent based blocking
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
      res.set("Retry-After", resetSec.toString())

      // If blocked by deny list
      if (reason === "denyList") {
        return res.status(403).json({
          error: "Access Denied",
          message: "Your IP address has been blocked due to suspicious activity",
          reason: "denyList",
        })
      }

      // Standard rate limit exceeded
      const minutes = Math.floor(resetSec / 60)
        .toString()
        .padStart(2, "0")
      const seconds = (resetSec % 60).toString().padStart(2, "0")

      return res.status(429).json({
        error: "Too Many Requests",
        message: `API rate limit exceeded. Please retry after ${minutes}:${seconds} minutes`,
        retryAfter: resetSec,
      })
    }

    next()
  } catch (error) {
    console.error("API rate limit error:", error)
    // On error, allow request but log it
    next()
  }
}

export { generalRatelimit, apiRatelimit }
