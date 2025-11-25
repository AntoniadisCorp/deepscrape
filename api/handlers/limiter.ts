// src/middleware/rateLimit.ts
import { redisClient } from '../../api/config'
import { Options, rateLimit, RateLimitRequestHandler } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'

// Extend Express Request type to include rateLimit property
declare module 'express-serve-static-core' {
    interface Request {
        rateLimit?: {
            resetTime?: number;
        };
    }
}

let redis_store = undefined
let redis_store_api = undefined

if (redisClient) {
    redis_store = new RedisStore({
        prefix: 'rateLimit:', // Optional prefix for keys in Redis
        // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
        sendCommand: (...args: string[]) => redisClient.call(...args),
        resetExpiryOnChange: true, // Reset the rate limit when the IP changes
    })
    redis_store_api = new RedisStore({
        prefix: 'apiRateLimit:', // Optional prefix for keys in Redis
        // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
        sendCommand: (...args: string[]) => redisClient.call(...args),
        resetExpiryOnChange: true, // Reset the rate limit when the IP changes
    })
}

const limmitOptions: Partial<Options> = {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    limit: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: false }, // Trust the reverse proxy
    store: redis_store, // Use Redis as the store for rate limiting
    handler: (req, res /*, next */) => {
        // Calculate retry-after in seconds
        const retryAfterMs = req?.rateLimit?.resetTime ? req.rateLimit.resetTime - Date.now() : 15 * 60 * 1000;
        const retryAfterSec = Math.max(1, Math.round(retryAfterMs / 1000));
        const minutes = Math.floor(retryAfterSec / 60).toString().padStart(2, '0');
        const seconds = (retryAfterSec % 60).toString().padStart(2, '0');
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
    <link rel="stylesheet" nonce="${res.locals['nonce']}" href="https://fonts.googleapis.com/css2?display=swap&family=Inter:wght@400;500;700;900&family=Noto+Sans:wght@400;500;700;900" />
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
}

// Create a rate limiter middleware for api routes
const apiLimmitOptions: Partial<Options> = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: false }, // Trust the reverse proxy
    store: redis_store_api, // Use Redis as the store for rate limiting
    handler: (req, res /*, next */) => {
        // Calculate retry-after in seconds
        const retryAfterMs = req?.rateLimit?.resetTime ? req.rateLimit.resetTime - Date.now() : 15 * 60 * 1000;
        const retryAfterSec = Math.max(1, Math.round(retryAfterMs / 1000));
        const minutes = Math.floor(retryAfterSec / 60).toString().padStart(2, '0');
        const seconds = (retryAfterSec % 60).toString().padStart(2, '0');
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
    <link rel="stylesheet" nonce="${res.locals['nonce']}" href="https://fonts.googleapis.com/css2?display=swap&family=Inter:wght@400;500;700;900&family=Noto+Sans:wght@400;500;700;900" />
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
}

const limiter: RateLimitRequestHandler = rateLimit(limmitOptions)
const apiLimiter: RateLimitRequestHandler = rateLimit(apiLimmitOptions)

export { limiter, apiLimiter }
