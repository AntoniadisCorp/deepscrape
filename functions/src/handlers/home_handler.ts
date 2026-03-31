/* eslint-disable indent */
/* eslint-disable object-curly-spacing */
import { Request, Response } from "express"
import { redis } from "../app/cacheConfig"
import { db } from "../app/config"
import { Timestamp } from "firebase-admin/firestore"
import { Users } from "../domain"

export const statusCheck = async (req: Request, res: Response) => {
    try {
        res.status(200).json({ status: "ok", message: "ok" })
    } catch (error) {
        console.error("Error in statusCheck:", error)
        res.status(500).json({
            status: "error",
            message: "API status check failed",
        })
    }
}

export const heartbeat = async (req: Request, res: Response) => {
    try {
        const parsedData = req.cookies["aid"] ? JSON.parse(req.cookies["aid"]) :
            req.app.locals["user"]
        const userId = parsedData?.userId
        const guestId = parsedData?.guestId || req.cookies["gid"]
        const loginId = parsedData?.loginId
        const now = new Date()
        const nowMs = now.getTime()
        const windowMs = 5 * 60 * 1000
        const cutoffMs = nowMs - windowMs
        let key
        let firestoreCollection
        let id
        if (userId) {
            if (loginId) {
                const cacheKey = `auth:session:revoked:${userId}:${loginId}`
                const revokedCacheRaw = await redis.get<unknown>(cacheKey)
                let revokedCache: {revokedAt?: string} | null = null
                if (typeof revokedCacheRaw === "string") {
                    try {
                        const parsed = JSON.parse(revokedCacheRaw)
                        revokedCache = parsed as {revokedAt?: string}
                    } catch {
                        revokedCache = null
                    }
                } else {
                    revokedCache = revokedCacheRaw as {
                        revokedAt?: string
                    } | null
                }

                if (revokedCache?.revokedAt) {
                    return res.status(401).json({
                        success: false,
                        code: "session_revoked",
                        message: "Session has been revoked",
                    })
                }

                const loginDocPath =
                    `login_metrics/${userId}/login_history_Info/${loginId}`
                const loginSnap = await db.doc(loginDocPath).get()
                if (loginSnap.exists) {
                    const loginData = loginSnap.data() as {
                        connected?: boolean
                        revokedAt?: Timestamp | Date | null
                        signOutTime?: Timestamp | Date | null
                    }

                    if (
                        loginData?.connected === false ||
                        loginData?.revokedAt ||
                        loginData?.signOutTime
                    ) {
                        const revokedCacheKey =
                            `auth:session:revoked:${userId}:${loginId}`
                        const revokedData = JSON.stringify({
                            revokedAt: new Date().toISOString(),
                        })
                        const thirtyDaysInSeconds = 60 * 60 * 24 * 30
                        await redis.setex(
                            revokedCacheKey,
                            thirtyDaysInSeconds,
                            revokedData,
                        )
                        return res.status(401).json({
                            success: false,
                            code: "session_revoked",
                            message: "Session has been revoked",
                        })
                    }
                }
            }

            key = `user:${userId}`
            firestoreCollection = "users"
            id = userId
        } else if (guestId) {
            key = `guest:${guestId}`
            firestoreCollection = "guests"
            id = guestId
        } else {
            // No ID, treat as new guest
            return res.status(400).json({
                success: false,
                message: "No guest or user ID found",
            })
        }
        // Update Redis (fast access)
        await redis.setex(key, 3600, JSON.stringify({ lastSeen: now }))

        // Track online users/guests via sorted sets (last 5 minutes)
        const onlineKey = userId ? "online:users" : "online:guests"
        await redis.zadd(onlineKey, { score: nowMs, member: id })
        await redis.zremrangebyscore(onlineKey, 0, cutoffMs)

        const [activeUsersNow, activeGuestsNow] = await Promise.all([
            redis.zcount("online:users", cutoffMs, nowMs),
            redis.zcount("online:guests", cutoffMs, nowMs),
        ])

        const onlineNow = (activeUsersNow || 0) + (activeGuestsNow || 0)

        // Update dashboard summary with live online counts
        await db.collection("metrics_summary").doc("dashboard").set({
            activeUsersNow: activeUsersNow || 0,
            activeGuestsNow: activeGuestsNow || 0,
            onlineNow: onlineNow,
            lastUpdated: Timestamp.now(),
            computedAt: Timestamp.now(),
        }, { merge: true })
        // Throttle Firestore writes: only update if lastSeen > 5 min ago
        const docRef = db.collection(firestoreCollection).doc(id)
        const doc = await docRef.get()
        const docData = doc.exists ? doc.data() as Users : undefined
        const lastSeen = docData && docData.lastSeen ?
            new Date(docData.lastSeen) : undefined
        if (!lastSeen || (now.getTime() - lastSeen.getTime() > 300000)) {
            await docRef.set({ lastSeen: now }, { merge: true })
        }
        return res.json({ success: true, lastSeen: now })
    } catch (error) {
        console.error("Heartbeat error:", error)
        return res.status(500).json({
            success: false,
            error: error instanceof Error ?
                error.message : "Unknown error",
        })
    }
}
