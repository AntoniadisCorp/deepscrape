/**
 * Shared `express-rate-limit` store backed by the Upstash REST client.
 *
 * Before this, the limiter used `rate-limit-redis` over an ioredis TCP client
 * while every other Redis consumer in the repo used `@upstash/redis` over REST.
 * That duplication carried a second credential path (`..._ro`) that did not
 * exist on the instance, so AUTH failed and `express-rate-limit` quietly fell
 * back to per-instance memory storage — distributed limiting was off.
 *
 * `rate-limit-redis` only needs a `sendCommand(...args)` shim and issues
 * `SCRIPT LOAD` / `EVALSHA` (the same commands `@upstash/redis` exposes through
 * `exec`), so it can be driven by the REST client directly.
 *
 * This module must stay free of browser-only imports: `src/config/*` is
 * type-checked by both the Angular and the Cloud Functions tsconfigs.
 */

import type { Redis } from '@upstash/redis'
import { RedisStore, type RedisReply } from 'rate-limit-redis'

/**
 * Sentinel used by the caller to detect a no-op client. A no-op client answers
 * every command with a success-shaped value, so it cannot be probed: the caller
 * must be told explicitly.
 */
export type RedisStoreFactory = (options: {
  prefix: string
  redis: Redis | null
  resetExpiryOnChange?: boolean
}) => RedisStore | undefined

/**
 * Build a distributed rate-limit store over Upstash REST.
 *
 * Returns `undefined` when no client is available. `express-rate-limit` then
 * uses its in-memory store, which is degraded but never blocks traffic.
 *
 * The returned proxy intentionally reports `undefined` from `exec` when the
 * client is the no-op stub, because that is the documented signal
 * `rate-limit-redis` uses to fall back to memory storage on its own.
 */
export const createRedisRateLimitStore: RedisStoreFactory = ({
  prefix,
  redis,
  resetExpiryOnChange = true,
}) => {
  if (!redis) {
    return undefined
  }

  try {
    return new RedisStore({
      prefix,
      resetExpiryOnChange,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: (...args: string[]): Promise<RedisReply> =>
        // `exec` is the generic command escape hatch documented by @upstash/redis
        // ("Generic method to execute any Redis command"). It deliberately returns
        // `undefined` for the no-op client so this store degrades to memory.
        (redis as unknown as {
          exec: (command: string[]) => Promise<RedisReply | undefined>
        }).exec(args as unknown as string[]) as Promise<RedisReply>,
    })
  } catch (error) {
    console.error(`rate-limit-redis: failed to initialize store for prefix "${prefix}"`, error)
    return undefined
  }
}
