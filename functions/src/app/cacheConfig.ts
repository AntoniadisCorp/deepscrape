/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable linebreak-style */
// eslint-disable-next-line object-curly-spacing
import { Redis } from "@upstash/redis"
import {RedisOptions, Redis as IORedis} from "ioredis"
import chalk from "chalk"
import {env} from "../config/env"

const sanitizeUpstashRestUrl = (value: string): string => {
    if (!value) {
        return ""
    }

    const normalized = value.trim()

    return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`
}

// Initialize Upstash Redis client
const upstashUrl = sanitizeUpstashRestUrl(env.UPSTASH_REDIS_REST_URL)
const upstashToken = env.UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_PASSWORD
const redis = new Redis({
    url: upstashUrl || "",
    token: upstashToken || "",
})


// Configure your Redis client.  IMPORTANT: Use environment variables
// for sensitive information like host, port, password.
const tcpHostRaw = env.UPSTASH_REDIS_REST_HOST || env.UPSTASH_REDIS_REST_URL || upstashUrl
const tcpPortRaw = env.UPSTASH_REDIS_REST_PORT || "6379"
const tcpUsernameRaw = env.UPSTASH_REDIS_REST_USER || "default"
const tcpPassword = env.UPSTASH_REDIS_REST_PASSWORD || ""

let client: IORedis | null = null

const parseRedisHost = (value: string): string => {
    try {
        const parsed = new URL(value)
        let host = parsed.hostname.trim().toLowerCase()

        // Defensive normalization for malformed values like: *.upstash.io.upstash.io
        const duplicatedSuffix = ".upstash.io.upstash.io"
        if (host.endsWith(duplicatedSuffix)) {
            host = host.replace(/\.upstash\.io\.upstash\.io$/, ".upstash.io")
        }

        return host
    } catch {
        return value.replace(/^https?:\/\//, "").trim().toLowerCase()
    }
}

// const isFunctionsEmulator =
//     process.env["FUNCTIONS_EMULATOR"] === "true" ||
//     !!env["FIREBASE_EMULATOR_HUB"]

const tcpRedisEnabled = env.UPSTASH_REDIS_TCP_ENABLED ?
    env.UPSTASH_REDIS_TCP_ENABLED === "true" :
    env.PRODUCTION === "true"


if (tcpRedisEnabled &&
    // !isFunctionsEmulator &&
    tcpHostRaw?.length &&
    tcpPortRaw?.length &&
    tcpPassword?.length) {
    // Configure your Redis client.  IMPORTANT: Use environment variables
    // for sensitive information like host, port, password.
    const host = parseRedisHost(tcpHostRaw)
    const user = `${tcpUsernameRaw}_ro`
    const port = parseInt(tcpPortRaw || "6379", 10)
    const REDIS_URL = `rediss://:${encodeURIComponent(tcpPassword)}@${host}:${port}`

    // Define Redis options
    const redisOptions: RedisOptions = {
        // host: host || "localhost", // Read from env
        // port, // Read from env
        // username: user || "default", // Use read-only user for Redis TCP
        // password: tcpPassword || "", // Read from env
        db: 0, // Default database
        lazyConnect: true, // Use lazy connect to avoid immediate connection
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) => {
            if (times > 10) {
                return null
            }
            return Math.min(times * 200, 2000)
        },
        tls: {},
    }

    // Set username if provided which should resolve the
    // authentication issue with older Redis versions.

    client = new IORedis(REDIS_URL, redisOptions)

    // Log the Redis URL for debugging purposes
    console.log(chalk.hex("#028C9E").bold("Upstash Redis client initialized ") + chalk.yellow.bold(`${host}:${port} (${user})`))

    // client.quit() // Ensure we start with a clean slate
    client.on("reconnecting", () => {
        console.log("Redis client reconnecting...")
    })
    client.on("error", (err) => {
        console.error("Redis connection error:", err)
    })
    client.once("ready", () => {
        console.log("Redis client ready")
    })
    client.on("connect", () => {
        console.log("Redis client connected")
    })
    client.on("end", () => {
        console.log("Redis client end")
    })
    client.on("quit", () => {
        console.log("Redis client quit")
    })
} else if (/* isFunctionsEmulator || */ !tcpRedisEnabled) {
    console.warn("Redis TCP client disabled (emulator or UPSTASH_REDIS_TCP_ENABLED=false); using non-TCP fallback")
} else {
    console.warn("Redis client not connected: Missing TCP environment variables (UPSTASH_REDIS_REST_HOST/PORT/USER/PASSWORD)")
}

export {client as redisClient, redis}
