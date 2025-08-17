/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable linebreak-style */
// eslint-disable-next-line object-curly-spacing
import { Redis } from "@upstash/redis"
import {RedisOptions, Redis as IORedis} from "ioredis"
import chalk from "chalk"

import * as dotenv from "dotenv"
dotenv.config()


// Initialize Upstash Redis client
const upstashUrl = process.env["UPSTASH_REDIS_REST_URL"]
const upstashToken = process.env["UPSTASH_REDIS_REST_TOKEN"]
const redis = new Redis({
    url: upstashUrl || "",
    token: upstashToken || "",
})


// Configure your Redis client.  IMPORTANT: Use environment variables
// for sensitive information like host, port, password.
const httpHost = process.env["UPSTASH_REDIS_REST_URL"]
const port = process.env["UPSTASH_REDIS_REST_PORT"]
const username = process.env["UPSTASH_REDIS_REST_USER"] // Default username for Redis
const p4ss = process.env["UPSTASH_REDIS_REST_PASSWORD"]

let client: IORedis | null = null


if (httpHost?.length && port?.length && username?.length && p4ss?.length) {
    // Configure your Redis client.  IMPORTANT: Use environment variables
    // for sensitive information like host, port, password.
    // remove https:// from the host if it exists
    const host = httpHost.split("https://")[1]

    // Define Redis options
    const redisOptions: RedisOptions = {
        host: httpHost || "localhost", // Read from env
        port: parseInt(port || "30766"), // Read from env
        username: username || "default", // Default username for Redis
        password: p4ss || "", // Read from env
        db: 0, // Default database
        lazyConnect: true, // Use lazy connect to avoid immediate connection
    }

    // Set username if provided which should resolve the
    // authentication issue with older Redis versions.

    const redisUrl = `rediss://${redisOptions.username}:${redisOptions.password}@${host}:${port}`
    client = new IORedis(redisUrl)

    // Log the Redis URL for debugging purposes
    // console.log(chalk.hex("#74A36AFF").bold("Upstash URL") + ": " + chalk.yellow.bold(`${redisUrl}`))
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
    console.error("Redis client not connected: Missing environment variables")
}

export {client as redisClient, redis}
