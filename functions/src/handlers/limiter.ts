/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable max-len */
// src/middleware/rateLimit.ts
import { rateLimit } from "express-rate-limit"
// import { RedisStore } from 'rate-limit-redis'

/* const host = process.env['REDIS_HOST']
const port = process.env['REDIS_PORT']
const p4ss = process.env['REDIS_PASSWORD']
// Configure your Redis client.  IMPORTANT: Use environment variables
// for sensitive information like host, port, password.
const redisClient = new Redis({
    host: host || 'localhost', // Read from env
    port: parseInt(port || '6379'), // Read from env
    password: p4ss // Add password if you have one
})

if (host?.length && port?.length && p4ss?.length) {
    redisClient.connect().catch(console.error)
    console.log('Redis client connected')
} */


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: true }, // Trust the reverse proxy
    /* store: new RedisStore({
          prefix: 'rateLimit:', // Optional prefix for keys in Redis
          // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
          sendCommand: async (...args: string[]) => redisClient.call(...args)
      }), */
})

// eslint-disable-next-line object-curly-spacing
export { limiter }
