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

// Initialize Upstash Redis client
const upstashUrl = sanitizeUpstashRestUrl(env.UPSTASH_REDIS_REST_URL)
const upstashToken = env.UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
    url: upstashUrl || "",
    token: upstashToken || "",
})


// Configure your Redis client.  IMPORTANT: Use environment variables
// for sensitive information like host, port, password.
const tcpHostRaw = env.UPSTASH_REDIS_REST_URL || upstashUrl
const tcpPortRaw = env.UPSTASH_REDIS_REST_PORT || env.UPSTASH_REDIS_REST_PORT
const tcpUsername = env.UPSTASH_REDIS_REST_USER || env.UPSTASH_REDIS_REST_USER // Default username for Redis
const tcpPassword = env.UPSTASH_REDIS_REST_PASSWORD || env.UPSTASH_REDIS_REST_PASSWORD

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


if (tcpHostRaw?.length && tcpPortRaw?.length && tcpUsername?.length && tcpPassword?.length) {
    // Configure your Redis client.  IMPORTANT: Use environment variables
    // for sensitive information like host, port, password.
    const host = parseRedisHost(tcpHostRaw)
    const port = parseInt(tcpPortRaw || "30766", 10)

    // Define Redis options
    const redisOptions: RedisOptions = {
        host: host || "localhost", // Read from env
        port, // Read from env
        username: tcpUsername || "default", // Default username for Redis
        password: tcpPassword || "", // Read from env
        db: 0, // Default database
        lazyConnect: true, // Use lazy connect to avoid immediate connection
        tls: {},
    }

    // Set username if provided which should resolve the
    // authentication issue with older Redis versions.

    client = new IORedis(redisOptions)

    // Log the Redis URL for debugging purposes
    console.log(chalk.hex("#028C9E").bold("Upstash Redis client initialized ") + chalk.yellow.bold(`${host}:${port}`))

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
} else {
    console.warn("Redis client not connected: Missing TCP environment variables (UPSTASH_REDIS_REST_URL/PORT/USERNAME/PASSWORD)")
}

export {client as redisClient, redis}
