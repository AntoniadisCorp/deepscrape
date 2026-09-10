/* eslint-disable max-len */
import {describe, it} from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {join} from "node:path"

/**
 * Round-trip budget for the heartbeat path.
 *
 * Every bare `await redis.x()` through the Upstash REST client is one HTTPS request,
 * so N sequential calls cost N round-trips. The hot path must route through
 * pipeline() (one HTTP request for many commands) instead.
 *
 * This is a ratchet, not a target: the remaining bare calls are on legacy/error paths
 * (device-mismatch dedupe, the backwards-compat login_history_Info fallback). It fails
 * if someone adds another one to the hot path.
 */
const BARE_REDIS_BUDGET = 5

const countMatches = (source: string, pattern: RegExp): number =>
  [...source.matchAll(pattern)].length

describe("redis round-trip budget", () => {
  const handler = readFileSync(join(__dirname, "home_handler.ts"), "utf8")

  it("does not add bare redis round-trips to the heartbeat", () => {
    const bare = countMatches(
      handler,
      /await redis\.(get|set|setex|del|zadd|zremrangebyscore|zcount|incr)\(/g,
    )

    assert.ok(
      bare <= BARE_REDIS_BUDGET,
      `home_handler.ts has ${bare} bare await redis.* calls (budget ${BARE_REDIS_BUDGET}). ` +
      "Batch them into redis.pipeline() or a single script call instead of adding round-trips.",
    )
  })

  // Deliberately no assertion on pipeline() counts: the transport mechanism is allowed to
  // change (pipelines today, a single READ_SESSION_WITH_TTL_REFRESH script tomorrow). The
  // invariant is the round-trip budget above, not how the batching is spelled.
})
