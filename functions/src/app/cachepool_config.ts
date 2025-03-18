/* eslint-disable max-len */
/* eslint-disable indent */
/* import * as genericPool from "generic-pool"
import Redis from "ioredis"

// Configuration for Redis
const redisConfig = {
    host: process.env["dasdsa"] || "sas", // Redis host
    port: process.env["dasdsa"] || 6379, // Redis port
    password: process.env["dasdsa"] || "dsd", // Optional password
    db: 0, // Default database
}

// Create a factory for the pool
const factory = {
    create: async () => {
        const client = new Redis({
            host: redisConfig.host,
            port: Number(redisConfig.port),
            password: redisConfig.password,
            db: redisConfig.db,
        })
        client.on("error", (err) => {
            console.error("Redis error:", err)
        })
        return client
    },
    destroy: async (client: any) => {
        await client.quit()
    },
} */

/*
2. Connection Limits
Problem: Upstash Redis plans (except Enterprise) have strict limits on the number of concurrent connections. Using a connection pool (generic-pool) might exceed these limits if the pool size is too large, especially during a traffic spike at startup.
Solution: If you continue using ioredis, reduce the pool size to avoid hitting Upstash's connection limits:
javascript
Copy
Edit
const pool = genericPool.createPool(factory, {
  max: 10, // Set a small max pool size
  min: 2,
});
Alternatively, switch to the Upstash Redis client to avoid this issue altogether. */
// Create the Redis connection pool
/* const pool = genericPool.createPool(factory, {
    max: 10, // Maximum number of connections in the pool
    min: 2, // Minimum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    acquireTimeoutMillis: 10000, // Timeout for acquiring a connection
}) */

// Wrapper function to use Redis from the pool
/**
 * Executes a callback function using a Redis client from the connection pool.
 *
 // eslint-disable-next-line max-len
 * @param {Function} callback - The function to execute with the acquired Redis client.
 * @return {Promise<any>} The result of the callback function.
 * @throws Will throw an error if the callback function encounters an error.
 *
 * The function ensures that the Redis client is released back to the pool
 * after the callback execution, regardless of success or failure.
 */
/* export async function getRedisClient() {
    const client = await pool.acquire()
    return {
        client,
        release: () => pool.release(client),
    }
}
 */
/* // Example usage
(async () => {
    const { client: redis, release } = await getRedisClient();
    try {
      await redis.set('key', 'value');
      const value = await redis.get('key');
      console.log('Retrieved value:', value);
    } catch (error) {
      console.error('Redis operation error:', error);
    } finally {
      release(); // Always release the client back to the pool
    }
  })(); */

// Graceful shutdown
/* process.on("SIGINT", async () => {
    console.log("Shutting down Redis pool...")
    await pool.drain()
    await pool.clear()
    process.exit(0)
})
 */
