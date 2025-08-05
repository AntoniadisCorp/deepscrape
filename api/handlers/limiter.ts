// src/middleware/rateLimit.ts
import { redisClient } from '../../api/config'
import { Options, rateLimit, RateLimitRequestHandler } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'

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
}

const limiter: RateLimitRequestHandler = rateLimit(limmitOptions)
const apiLimiter: RateLimitRequestHandler = rateLimit(apiLimmitOptions)

export { limiter, apiLimiter }
