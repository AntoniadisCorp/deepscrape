// import { CopyCommand, Redis, } from "@upstash/redis"
import { RedisOptions, Redis } from 'ioredis'
import chalk from 'chalk'
import { config } from 'dotenv'
// Load environment variables from .env file
config()

// Initialize Upstash Redis client
// export const redisClient = new Redis({
//     url: process.env["UPSTASH_REDIS_REST_URL"] || "",
//     token: process.env["UPSTASH_REDIS_REST_TOKEN"] || "",
// })
const HttpHost = process.env['UPSTASH_REDIS_REST_URL']
const port = process.env['UPSTASH_REDIS_REST_PORT']
const username = process.env['UPSTASH_REDIS_REST_USER'] // Default username for Redis
const p4ss = process.env['UPSTASH_REDIS_REST_PASSWORD']


let client: Redis | null = null



if (HttpHost?.length && port?.length && p4ss?.length) {
    // remove https:// from the host if it exists

    const host = HttpHost.split('https://')[1]
    const redisOptions: RedisOptions = {
        host: HttpHost || 'localhost', // Read from env
        port: parseInt(port || '30766'), // Read from env
        username: username || 'default', // Default username for Redis
        password: p4ss || '', // Read from env
        db: 0, // Default database
        lazyConnect: true, // Use lazy connect to avoid immediate connection
    }

    // Configure your Redis client.  IMPORTANT: Use environment variables
    // for sensitive information like host, port, password.
    const redisUrl = `rediss://${redisOptions.username}:${redisOptions.password}@${host}:${port}`
    client = new Redis(redisUrl, redisOptions)
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