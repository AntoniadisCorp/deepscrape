/* eslint-disable max-len */
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

const computeDeviceFingerprint = (userAgent: string, ipAddress: string): string =>
    `${userAgent}|${ipAddress}`

const logSuspiciousDeviceMismatch = async (params: {
    userId: string
    loginId: string
    currentFingerprint: string
    storedFingerprint: string
    ipAddress: string
    userAgent: string
    browser: string
    os: string
    providerId: string
}) => {
    const dedupeKey = `security:device-mismatch:${params.loginId}:${params.currentFingerprint}`
    const alreadyLogged = await redis.get(dedupeKey)
    if (alreadyLogged) {
        return
    }

    await redis.setex(dedupeKey, 10 * 60, "1")
    const now = Timestamp.now()

    await Promise.all([
        db.collection("audit_logs").add({
            action: "device_mismatch_detected",
            admin_uid: "system:heartbeat",
            target_loginId: params.loginId,
            target_userId: params.userId,
            reason: "Session heartbeat fingerprint mismatch",
            timestamp: now,
            isAdmin: false,
            metadata: {
                currentFingerprint: params.currentFingerprint,
                storedFingerprint: params.storedFingerprint,
                ipAddress: params.ipAddress,
            },
        }),
        db.collection("login_metrics")
            .doc(params.userId)
            .collection("login_history_events")
            .doc()
            .set({
                uid: params.userId,
                eventType: "device_mismatch",
                eventSessionId: params.loginId,
                providerId: params.providerId,
                browser: params.browser,
                os: params.os,
                userAgent: params.userAgent,
                ipAddress: params.ipAddress,
                location: "",
                connected: true,
                createdAt: now,
                metadata: {
                    currentFingerprint: params.currentFingerprint,
                    storedFingerprint: params.storedFingerprint,
                },
            }),
    ])
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
        let requiresReauth = false
        let key
        let firestoreCollection
        let id
        if (userId) {
            if (loginId) {
                // Check new loginSessions collection first (enterprise architecture)
                const cachedRevoked = await redis.get(`revoked:${loginId}`)
                if (cachedRevoked) {
                    return res.status(401).json({
                        success: false,
                        code: "session_revoked",
                        message: "Session has been revoked",
                    })
                }

                // Check cached session validity
                const cachedSession = await redis.get(`session:${loginId}`)
                if (cachedSession && typeof cachedSession === "string") {
                    try {
                        const sessionData = JSON.parse(cachedSession)
                        if (sessionData.userId === userId && sessionData.active) {
                            // PHASE 3.1: Device fingerprint verification and suspicious activity logging.
                            if (sessionData.deviceFingerprint) {
                                const currentUserAgent = req.get("user-agent") || ""
                                const ipAddress = req.ip || req.connection.remoteAddress || ""
                                const expectedFingerprint = computeDeviceFingerprint(currentUserAgent, ipAddress)
                                const storedFingerprint = sessionData.deviceFingerprint

                                if (expectedFingerprint !== storedFingerprint) {
                                    requiresReauth = true
                                    console.warn(`⚠️ Device fingerprint mismatch for session ${loginId}: IP or UA changed`)
                                    try {
                                        await logSuspiciousDeviceMismatch({
                                            userId,
                                            loginId,
                                            currentFingerprint: expectedFingerprint,
                                            storedFingerprint,
                                            ipAddress,
                                            userAgent: currentUserAgent,
                                            browser: sessionData.browser || "",
                                            os: sessionData.os || "",
                                            providerId: sessionData.providerId || "firebase",
                                        })
                                    } catch (logError) {
                                        console.warn("Failed to log suspicious device mismatch", logError)
                                    }
                                }
                            }

                            // Valid cached session - update lastActivityAt
                            await db
                                .collection("loginSessions")
                                .doc(loginId)
                                .update({ lastActivityAt: Timestamp.now() })
                                .catch((err) => console.warn("Failed to update session activity:", err))

                            // Refresh Redis cache TTL
                            await redis.setex(`session:${loginId}`, 30 * 60, cachedSession)
                            // Continue to online tracking below
                        }
                    } catch (e) {
                        // Fallthrough to Firestore check
                    }
                }

                // Fallback: Check loginSessions collection (slower path)
                try {
                    const sessionSnap = await db.collection("loginSessions").doc(loginId).get()
                    if (sessionSnap.exists) {
                        const sessionData = sessionSnap.data() as {
                            userId?: string
                            active?: boolean
                            revokedAt?: Timestamp | null
                            deviceFingerprint?: string
                            browser?: string
                            os?: string
                            providerId?: string
                            userAgent?: string
                            ipAddress?: string
                        }

                        if (sessionData?.userId === userId && sessionData?.active === true && !sessionData?.revokedAt) {
                            if (sessionData.deviceFingerprint) {
                                const currentUserAgent = req.get("user-agent") || ""
                                const ipAddress = req.ip || req.connection.remoteAddress || ""
                                const expectedFingerprint = computeDeviceFingerprint(currentUserAgent, ipAddress)
                                const storedFingerprint = sessionData.deviceFingerprint

                                if (expectedFingerprint !== storedFingerprint) {
                                    requiresReauth = true
                                    try {
                                        await logSuspiciousDeviceMismatch({
                                            userId,
                                            loginId,
                                            currentFingerprint: expectedFingerprint,
                                            storedFingerprint,
                                            ipAddress,
                                            userAgent: currentUserAgent,
                                            browser: sessionData.browser || "",
                                            os: sessionData.os || "",
                                            providerId: sessionData.providerId || "firebase",
                                        })
                                    } catch (logError) {
                                        console.warn("Failed to log suspicious device mismatch", logError)
                                    }
                                }
                            }
                        } else {
                            // Revoked or invalid
                            return res.status(401).json({
                                success: false,
                                code: "session_revoked",
                                message: "Session has been revoked",
                            })
                        }
                    }
                } catch (e) {
                    // If both checks fail, fallback to old login_history_Info for backwards compat
                    console.log("loginSessions check failed, falling back to login_history_Info")
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
        return res.json({ success: true, lastSeen: now, requiresReauth })
    } catch (error) {
        console.error("Heartbeat error:", error)
        return res.status(500).json({
            success: false,
            error: error instanceof Error ?
                error.message : "Unknown error",
        })
    }
}
