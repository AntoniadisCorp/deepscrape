/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable max-len */
// src/middleware/rateLimit.ts
import { Options, rateLimit, RateLimitRequestHandler } from "express-rate-limit"
import { RedisStore, type RedisReply } from "rate-limit-redis"
import { redisClient } from "../app/cacheConfig" // Adjust the import path as necessary

// Extend Express Request type to include rateLimit property
declare module "express-serve-static-core" {
    interface Request {
        rateLimit?: {
            resetTime?: number
        }
    }
}

let redisStore = undefined

if (redisClient) {
    // Initialize Redis store for rate limiting
    redisStore = new RedisStore({
        // prefix: "rateLimit:", // Optional prefix for keys in Redis // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
        sendCommand: (command: string, ...args: string[]) => redisClient?.call(command, ...args) as Promise<RedisReply>,
        resetExpiryOnChange: true, // Reset the rate limit when the IP changes
    })
}
// Create a rate limiter middleware for api routes
const apiLimmitOptions: Partial<Options> = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
    handler: (req, res) => {
        const retryAfter = Math.round(req?.rateLimit?.resetTime ? req.rateLimit.resetTime / 1000 : 15)

        res.status(429).json({
            error: "Rate limit exceeded",
            message: "Too many requests from this IP, please try again later",
            retryAfter: retryAfter ? Number(retryAfter) : undefined,
        })
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: true, ip: process.env.PRODUCTION === "true" }, // Trust the reverse proxy
    store: redisStore, // Use Redis as the store for rate limiting
    // skipSuccessfulRequests: true, // Don't count successful logins

}

const limiter: RateLimitRequestHandler = rateLimit(apiLimmitOptions)

// eslint-disable-next-line object-curly-spacing
export { limiter }
