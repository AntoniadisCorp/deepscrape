/* eslint-disable indent */
/* eslint-disable linebreak-style */
// eslint-disable-next-line object-curly-spacing
import { Redis } from "@upstash/redis"

// Initialize Upstash Redis client
export const redis = new Redis({
    url: process.env["UPSTASH_REDIS_REST_URL"],
    token: process.env["UPSTASH_REDIS_REST_TOKEN"],
})
