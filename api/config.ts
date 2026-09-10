import { Redis } from '@upstash/redis'
import chalk from 'chalk'
import { config } from '@dotenvx/dotenvx'
import { env } from '../src/config/env'

// Load environment variables from .env file
config({ quiet: true })

/**
 * Upstash REST client for the Express API.
 *
 * This used to be an ioredis TCP client, which meant the API and the Cloud
 * Functions talked to the same Redis through two different wire protocols with
 * two different credential paths and two different sets of failure modes. The
 * only consumer was the rate-limit store, so the API now uses the REST client
 * like everything else.
 */

const sanitizeUpstashRestUrl = (value: string): string => {
  if (!value) {
    return ''
  }

  let normalized = value.trim().replace(/\/+$/, '')
  normalized = normalized.replace(/\.upstash\.io\.upstash\.io(\/|$)/, '.upstash.io$1')

  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`
}

const isEncryptedPlaceholder = (value: string): boolean =>
  /^encrypted:/i.test((value || '').trim())

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const upstashUrl = sanitizeUpstashRestUrl(env.UPSTASH_REDIS_REST_URL)
const upstashToken = env.UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_PASSWORD

const upstashRestEnabled =
  !!upstashUrl &&
  !!upstashToken &&
  isHttpUrl(upstashUrl) &&
  !isEncryptedPlaceholder(upstashUrl) &&
  !isEncryptedPlaceholder(upstashToken)

const createNoopRedis = (): Redis => ({
  pipeline: () => ({
    exec: async () => [],
  }),
  get: async () => null,
  set: async () => 'OK',
  setex: async () => 'OK',
  del: async () => 0,
  incr: async () => 0,
  expire: async () => 0,
  ttl: async () => -2,
  // `undefined` is the "store unavailable" signal rate-limit-redis expects; it
  // then falls back to its in-memory store rather than throwing on every request.
  exec: async () => undefined,
} as unknown as Redis)

const client: Redis = upstashRestEnabled
  ? new Redis({ url: upstashUrl, token: upstashToken })
  : createNoopRedis()

if (upstashRestEnabled) {
  console.log(chalk.hex('#028C9E').bold('Upstash Redis REST client initialized ') + chalk.yellow.bold(upstashUrl))
} else {
  console.error(
    'Redis client not connected: missing or encrypted UPSTASH_REDIS_REST_URL/TOKEN. ' +
    'Rate limiting will use per-instance memory.',
  )
}

export { client as redisClient, upstashRestEnabled as isRedisEnabled }
