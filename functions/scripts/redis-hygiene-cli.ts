/* eslint-disable max-len */
/**
 * CLI for the Redis hygiene audit.
 *
 * Kept separate from `redis-hygiene.ts` so the audit logic stays importable in
 * tests without executing on import.
 *
 * Usage:
 *   npx tsx functions/scripts/redis-hygiene-cli.ts
 *   npx tsx functions/scripts/redis-hygiene-cli.ts 50
 *
 * Credentials: reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from the
 * environment, falling back to functions/.deploy-secrets.json (gitignored).
 */

import {existsSync, readFileSync} from "node:fs"
import {join} from "node:path"
import {Redis} from "@upstash/redis"
import {auditRedisKeys, renderReport, type AuditRedis} from "./redis-hygiene"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isEncryptedPlaceholder = (value: string): boolean =>
  /^encrypted:/i.test((value || "").trim())

const loadSecretsFile = (): Record<string, string> => {
  const secretsPath = join(__dirname, "..", ".deploy-secrets.json")
  if (!existsSync(secretsPath)) {
    return {}
  }
  try {
    return JSON.parse(readFileSync(secretsPath, "utf8")) as Record<string, string>
  } catch (error) {
    console.warn(`Could not parse ${secretsPath}:`, error)
    return {}
  }
}

/**
 * Read credentials, run the audit, print the report and exit non-zero on failure.
 *
 * @return {Promise<void>} Resolves after the process exit code has been set.
 */
async function main(): Promise<void> {
  const sampleArg = Number(process.argv[2])
  const sampleSize = Number.isFinite(sampleArg) && sampleArg > 0 ? Math.floor(sampleArg) : undefined

  const secrets = loadSecretsFile()
  const url = process.env["UPSTASH_REDIS_REST_URL"] || secrets["UPSTASH_REDIS_REST_URL"] || ""
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"] || secrets["UPSTASH_REDIS_REST_TOKEN"] || ""

  if (!url || !token || isEncryptedPlaceholder(url) || isEncryptedPlaceholder(token)) {
    console.error(
      "Missing plaintext Redis credentials. Set UPSTASH_REDIS_REST_URL and " +
      "UPSTASH_REDIS_REST_TOKEN, or populate functions/.deploy-secrets.json.",
    )
    process.exit(2)
  }

  const client = new Redis({url, token})

  // `@upstash/redis` returns tuples from SCAN as [string, string[]]; the audit
  // only depends on the value half, so adapt it to the AuditRedis contract.
  const redis: AuditRedis = {
    dbsize: () => client.dbsize(),
    llen: (key) => client.llen(key),
    zcard: (key) => client.zcard(key),
    ttl: (key) => client.ttl(key),
    scan: async (cursor, options) => {
      const [next, keys] = await client.scan(cursor, options)
      // Space the scans out so the audit cannot itself become a load source.
      await sleep(50)
      return [next, keys]
    },
  }

  const report = await auditRedisKeys(redis, {sampleSize})
  const {text, exitCode} = renderReport(report)
  console.log(text)
  process.exit(exitCode)
}

main().catch((error) => {
  console.error("Redis hygiene audit failed:", error)
  process.exit(2)
})
