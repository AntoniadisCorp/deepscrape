// import { CopyCommand, Redis, } from "@upstash/redis"
import { RedisOptions, Redis } from 'ioredis'
import chalk from 'chalk'
import { config } from '@dotenvx/dotenvx'
import { env } from '../src/config/env'

// Load environment variables from .env file
config({ quiet: true })

// Initialize Upstash Redis client
// export const redisClient = new Redis({
//     url: process.env["UPSTASH_REDIS_REST_URL"] || "",
//     token: process.env["UPSTASH_REDIS_REST_TOKEN"] || "",
// })
const tcpHostRaw = env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_URL
const tcpPortRaw = env.UPSTASH_REDIS_REST_PORT || env.UPSTASH_REDIS_REST_PORT
const tcpUsername = env.UPSTASH_REDIS_REST_USER || env.UPSTASH_REDIS_REST_USER // Default username for Redis
const tcpPassword = env.UPSTASH_REDIS_REST_PASSWORD || env.UPSTASH_REDIS_REST_PASSWORD


let client: Redis | null = null

const parseRedisHost = (value: string): string => {
    try {
        const parsed = new URL(value)
        let host = parsed.hostname.trim().toLowerCase()

        const duplicatedSuffix = '.upstash.io.upstash.io'
        if (host.endsWith(duplicatedSuffix)) {
            host = host.replace(/\.upstash\.io\.upstash\.io$/, '.upstash.io')
        }

        return host
    } catch {
        const host = value.replace(/^https?:\/\//, '').trim().toLowerCase()

        if (host.endsWith('.upstash.io.upstash.io')) {
            return host.replace(/\.upstash\.io\.upstash\.io$/, '.upstash.io')
        }

        return host
    }
}


if (tcpHostRaw?.length && tcpPortRaw?.length && tcpPassword?.length) {
    const host = parseRedisHost(tcpHostRaw)
    const port = parseInt(tcpPortRaw || '30766', 10)
    const redisOptions: RedisOptions = {
        host: host || 'localhost', // Read from env
        port, // Read from env
        username: tcpUsername || 'default', // Default username for Redis
        password: tcpPassword || '', // Read from env
        db: 0, // Default database
        lazyConnect: true, // Use lazy connect to avoid immediate connection
        tls: {},
    }

    client = new Redis(redisOptions)
    console.log(chalk.hex('#028C9E').bold('Upstash Redis client initialized ') + chalk.yellow.bold(`${host}:${port}`))
    // client.quit() // Ensure we start with a clean slate
    client.on('reconnecting', () => {
        console.log('Redis client reconnecting...')
    })
    client.on('error', (err) => {
        console.error('Redis connection error:', err);
    })
    client.once('ready', () => {
        console.log('Redis client ready');
    })
    client.on('connect', () => {
        console.log('Redis client connected')
    })
    client.on('end', () => {
        console.log('Redis client end')
    })
    client.on('quit', () => {
        console.log('Redis client quit')
    })
} else {
    console.error('Redis client not connected: Missing environment variables')
}


export { client as redisClient }