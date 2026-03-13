/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable max-len */
// src/middleware/rateLimit.ts
import { Options, rateLimit, RateLimitRequestHandler } from "express-rate-limit"
import { env } from "../config/env"
import { RedisStore, type RedisReply } from "rate-limit-redis"
import { redisClient } from "../app/cacheConfig" // Adjust the import path as necessary

let redisStore = undefined

if (redisClient) {
    // Initialize Redis store for rate limiting
    redisStore = new RedisStore({
        // prefix: "rateLimit:", // Optional prefix for keys in Redis // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
        sendCommand: (command: string, ...args: string[]) => redisClient?.call(command, ...args) as Promise<RedisReply>,
        resetExpiryOnChange: true, // Reset the rate limit when the IP changes
    })
}

// Use Redis store if available, otherwise default to in-memory
const apiLimitOptions: Partial<Options> = {
    windowMs: env.PRODUCTION === "true" ? 15 * 60 * 1000 : 1 * 60 * 1000, // 15 min (prod) or 1 min (dev)
    max: env.PRODUCTION === "true" ? 100 : 50, // 100 req (prod) or 50 req (dev) per window
    message: "Too many requests from this IP, please try again after the window expires",
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === "/health" || req.path === "/ping"
    },
    keyGenerator: (req) => {
        // Use IP address as the key, fallback to user ID if authenticated
        return req.user?.uid || req.ip || "unknown"
    },
    handler: (req, res) => {
        const defaultWindowMs = env.PRODUCTION === "true" ? 15 * 60 * 1000 : 1 * 60 * 1000
        const resetTime = req?.rateLimit?.resetTime
      const resetTimeMs =
        typeof resetTime === "number" ? resetTime : resetTime instanceof Date?
         resetTime.getTime() : undefined
        const retryAfterMs =
        typeof resetTimeMs === "number" ?
        resetTimeMs - Date.now() : defaultWindowMs
        const retryAfterSec = Math.max(1, Math.round(retryAfterMs / 1000))
        const minutes = Math.floor(retryAfterSec / 60).toString().padStart(2, "0")
        const seconds = (retryAfterSec % 60).toString().padStart(2, "0")

        res.status(429)
            .set("Content-Type", "text/html")
            .send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>429 Too Many Requests</title>
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin />
    <link rel="stylesheet" nonce="${res.locals.nonce}" href="https://fonts.googleapis.com/css2?display=swap&family=Inter:wght@400;500;700;900&family=Noto+Sans:wght@400;500;700;900" />
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
        <span class="text-blue-600 font-semibold">Retry-After: ${retryAfterSec} seconds</span>
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
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: true, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: true, ip: env.PRODUCTION === "true" },
    store: redisStore, // Use Redis as the store for rate limiting if available
}


const limiter: RateLimitRequestHandler = rateLimit(apiLimitOptions)

export { limiter }
