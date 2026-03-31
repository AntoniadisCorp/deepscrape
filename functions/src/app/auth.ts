/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable object-curly-spacing */
import { FieldPath, FieldValue } from "firebase-admin/firestore"
import { db, dbName, getSecretFromManager, saveToSecretManager, auth as adminAuth } from "./config"
import { auth } from "firebase-functions/v1"
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { HttpsError, onCall as onCallv2 } from "firebase-functions/v2/https"
import { env } from "../config/env"
import { redis } from "./cacheConfig"

const bootstrapAdminEmails = new Set(
    env.ADMIN_EMAILS
        .map((item) => item.toLowerCase())
)

const isBootstrapAdmin = (email?: string | null): boolean => {
    if (!email) {
        return false
    }

    return bootstrapAdminEmails.has(email.toLowerCase())
}

const SESSION_REVOKED_TTL_SECONDS = 60 * 60 * 24 * 30

const getSessionRevocationKey = (uid: string, loginId: string): string =>
    `auth:session:revoked:${uid}:${loginId}`

const cacheRevokedSession = async (uid: string, loginId: string, revokedAtIso: string): Promise<void> => {
    try {
        await redis.setex(getSessionRevocationKey(uid, loginId), SESSION_REVOKED_TTL_SECONDS, JSON.stringify({revokedAt: revokedAtIso}))
    } catch (error) {
        console.warn("Failed to cache revoked session:", error)
    }
}

const getCachedRevokedSession = async (uid: string, loginId: string): Promise<{revokedAt?: string} | null> => {
    try {
        const cached = await redis.get<{revokedAt?: string}>(getSessionRevocationKey(uid, loginId))
        return cached || null
    } catch (error) {
        console.warn("Failed to read revoked session cache:", error)
        return null
    }
}


export const trackGuest = auth
    .user()
    .onCreate(async (user) => {
        try {
            // Assume we store guest_id in Firestore temp or pass it during signup
            const guestId = user.customClaims?.guestId || null
            const today = new Date().toISOString().split("T")[0]
            const hour = new Date().getHours()

            const userDoc = {
                analytics: {},
                // Store creation timestamp for analytics
                created_At: new Date(),
                loginMetricsId: guestId, // Link to guest if conversion
            }

            // Use batch for atomic updates to ensure consistency
            const batch = db.batch()

            if (guestId) {
                // Mark guest as converted
                const guestRef = db.collection("guests").doc(guestId)
                const guestSnap = await guestRef.get()
                if (guestSnap.exists) {
                    const guestData = guestSnap.data()
                    // Merge guest analytics into user document
                    userDoc.analytics = {
                        ...guestData,
                        mergedAt: Date.now(),
                    }

                    batch.update(guestRef, {
                        uid: user.uid,
                        linkedAt: new Date(),
                    })
                }
            }

            // Create user document
            const userRef = db.collection("users").doc(user.uid)
            batch.set(userRef, userDoc, { merge: true })

            // Update daily analytics metrics for real-time dashboard
            const dailyRef = db.collection("metrics_daily").doc(today)
            const dailyUpdate = {
                date: today,
                timestamp: FieldValue.serverTimestamp(),
                newUsers: FieldValue.increment(1),
                totalUsers: FieldValue.increment(1),
                activeUsers: FieldValue.increment(1),
                [`usersByHour.${hour}`]: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp(),
            }

            if (guestId) {
                dailyUpdate.guestConversions = FieldValue.increment(1)
            }

            batch.set(dailyRef, dailyUpdate, { merge: true })

            // Update dashboard summary for real-time UI updates
            const summaryRef = db.collection("metrics_summary").doc("dashboard")
            const summaryUpdate: Record<string, FieldValue> = {
                totalUsers: FieldValue.increment(1),
                activeUsers: FieldValue.increment(1),
                lastUpdated: FieldValue.serverTimestamp(),
                computedAt: FieldValue.serverTimestamp(),
            }

            if (guestId) {
                summaryUpdate.guestConversions = FieldValue.increment(1)
            }

            batch.set(summaryRef, summaryUpdate, { merge: true })

            // Initialize user login metrics
            const userMetricsRef = db.collection("users").doc(user.uid).collection("login_metrics").doc("summary")
            batch.set(userMetricsRef, {
                userId: user.uid,
                totalLogins: 0,
                loginStreak: 0,
                longestStreak: 0,
                wasGuest: !!guestId,
                guestId: guestId || null,
                linkedAt: guestId ? FieldValue.serverTimestamp() : null,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            })

            await batch.commit()
            console.log(`✅ User ${user.uid} created with real-time analytics updated (conversion: ${!!guestId})`)
        } catch (err) {
            console.error("❌ Error merging guest data into user:", err)
        }
    })


export const setDefaultAdminRole = auth
    .user()
    .onCreate(async (user/* , context: EventContext */) => {
        try {
            const role = "admin"

            if (isBootstrapAdmin(user.email)) {
                await adminAuth.setCustomUserClaims(user.uid, { role })
                // Set role and mark as onboarded — bootstrap admins skip the onboarding wizard
                await db.collection("users").doc(user.uid).set({
                    role,
                    onboardedAt: FieldValue.serverTimestamp(),
                }, { merge: true })
            }
        } catch (error) {
            console.error("Error setting default admin role:", error)
            throw new HttpsError("internal", "Error setting default admin role", error)
        }
    })

export const setDefaultRole = auth
    .user()
    .onCreate(async (user/* , context: EventContext */) => {
        try {
            if (isBootstrapAdmin(user.email)) {
                return
            }

            const role = "user"

            await adminAuth.setCustomUserClaims(user.uid, { role })
            // Only set role in Firestore if defined
            const userDoc: Record<string, unknown> = {}
            if (role !== undefined) {
                userDoc.role = role
            }
            await db.collection("users").doc(user.uid).set(userDoc, { merge: true })
        } catch (error) {
            console.error("Error setting default role:", error)
            throw new HttpsError("internal", "Error setting default role", error)
        }
    })

export const createDefaultOrganization = auth
    .user()
    .onCreate(async (user) => {
        try {
            const orgId = `org_${user.uid}`
            const membershipId = `${user.uid}_${orgId}`
            const orgName = user.displayName ? `${user.displayName} Workspace` : "Personal Workspace"

            const orgRef = db.collection("organizations").doc(orgId)
            const membershipRef = db.collection("memberships").doc(membershipId)
            const userRef = db.collection("users").doc(user.uid)

            const batch = db.batch()
            batch.set(orgRef, {
                id: orgId,
                name: orgName,
                slug: orgId,
                ownerId: user.uid,
                billingOwnerUid: user.uid,
                plan: "free",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true })

            batch.set(membershipRef, {
                id: membershipId,
                orgId,
                userId: user.uid,
                role: "owner",
                addedBy: user.uid,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true })

            batch.set(userRef, {
                defaultOrgId: orgId,
                updated_At: FieldValue.serverTimestamp(),
            }, { merge: true })

            await batch.commit()
        } catch (error) {
            console.error("Error creating default organization:", error)
            throw new HttpsError("internal", "Error creating default organization", error)
        }
    })

export const linkGuestToUser = onCallv2(async (req) => {
    try {
        const authenticatedUid = req.auth?.uid
        if (!authenticatedUid) {
            throw new HttpsError("unauthenticated", "User must be authenticated")
        }

        const guestIdRaw = req.data?.guestId
        const uidRaw = req.data?.uid
        const guestId = typeof guestIdRaw === "string" ? guestIdRaw.trim() : ""
        const uid = typeof uidRaw === "string" ? uidRaw.trim() : authenticatedUid

        if (!guestId) {
            throw new HttpsError("invalid-argument", "guestId is required")
        }

        if (uid !== authenticatedUid) {
            throw new HttpsError("permission-denied", "uid must match authenticated user")
        }

        const guestRef = db.collection("guests").doc(guestId)
        const userRef = db.collection("users").doc(uid)
        const guestSnap = await guestRef.get()
        const guestInfo = guestSnap.exists ? guestSnap.data() : null

        const batch = db.batch()
        batch.set(guestRef, {
            uid,
            linkedAt: FieldValue.serverTimestamp(),
            updated_At: FieldValue.serverTimestamp(),
        }, { merge: true })

        if (guestInfo) {
            const details = {
                latitude: typeof guestInfo.latitude === "number" ? guestInfo.latitude : 0,
                longitude: typeof guestInfo.longitude === "number" ? guestInfo.longitude : 0,
                country: typeof guestInfo.country === "string" ? guestInfo.country : "Unknown",
                geo: guestInfo.geo || { continent: "Unknown", region: "Unknown" },
                region: typeof guestInfo.region === "string" ? guestInfo.region : "Unknown",
                timezone: typeof guestInfo.timezone === "string" ? guestInfo.timezone : "UTC",
                location: typeof guestInfo.location === "string" ? guestInfo.location : "Unknown",
                updated_At: FieldValue.serverTimestamp(),
            }

            batch.set(userRef, {
                uid,
                details,
                updated_At: FieldValue.serverTimestamp(),
            }, { merge: true })
        }

        await batch.commit()

        return {
            ok: true,
            linkedUid: uid,
            guestId,
            guestInfo,
        }
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error
        }
        console.error("Error linking guest to user:", error)
        throw new HttpsError("internal", "Failed to link guest to user")
    }
})

export const getMyLoginSessions = onCallv2(async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    const limitRaw = Number(req.data?.limit ?? 20)
    const limitCount = Number.isFinite(limitRaw) ?
        Math.max(1, Math.min(50, Math.floor(limitRaw))) :
        20

    const snapshot = await db.collection(`login_metrics/${uid}/login_history_Info`)
        .orderBy("timestamp", "desc")
        .limit(limitCount)
        .get()

    const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() || {}),
    }))

    return {sessions}
})

export const revokeMyLoginSession = onCallv2(async (req) => {
    const uid = req.auth?.uid
    const loginId = typeof req.data?.loginId === "string" ? req.data.loginId.trim() : ""

    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    if (!loginId) {
        throw new HttpsError("invalid-argument", "loginId is required")
    }

    const sessionRef = db.doc(`login_metrics/${uid}/login_history_Info/${loginId}`)
    const sessionSnap = await sessionRef.get()

    if (!sessionSnap.exists) {
        throw new HttpsError("not-found", "Session not found")
    }

    const now = new Date()
    await sessionRef.set({
        connected: false,
        signOutTime: now,
        revokedAt: now,
        revokedByUid: uid,
    }, {merge: true})

    await cacheRevokedSession(uid, loginId, now.toISOString())

    return {
        success: true,
        loginId,
        revokedAt: now.toISOString(),
    }
})

export const getMyLoginSessionStatus = onCallv2(async (req) => {
    const uid = req.auth?.uid
    const loginId = typeof req.data?.loginId === "string" ? req.data.loginId.trim() : ""

    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated")
    }

    if (!loginId) {
        throw new HttpsError("invalid-argument", "loginId is required")
    }

    const cached = await getCachedRevokedSession(uid, loginId)
    if (cached?.revokedAt) {
        return {
            loginId,
            active: false,
            revoked: true,
            revokedAt: cached.revokedAt,
        }
    }

    const sessionSnap = await db.doc(`login_metrics/${uid}/login_history_Info/${loginId}`).get()
    if (!sessionSnap.exists) {
        return {
            loginId,
            active: false,
            revoked: true,
            revokedAt: null,
        }
    }

    const session = sessionSnap.data() as {
        connected?: boolean
        revokedAt?: Date | null
        signOutTime?: Date | null
    } | undefined
    const revokedAt = session?.revokedAt instanceof Date ? session.revokedAt.toISOString() : null
    const active = session?.connected === true && !session?.revokedAt && !session?.signOutTime

    if (!active) {
        await cacheRevokedSession(uid, loginId, revokedAt || new Date().toISOString())
    }

    return {
        loginId,
        active,
        revoked: !active,
        revokedAt,
    }
})

// Firebase Function: Create API Key
export const createMyApiKey = onCallv2(async (req) => {
    const { apiKey } = req.data

    try {
        const userId = req?.auth?.uid
        if (!userId) {
            throw new Error("User must be authenticated")
        }

        // const apiKeyId = crypto.randomUUID()
        // const apiKey = generateApiKey()

        // Save metadata in Firestore
        const newApiKeyDoc = await db.collection(`users/${userId}/apikeys`).doc()

        // Save API key in Secret Manager
        const secretName = `users_${userId}_apikey_${newApiKeyDoc.id}`
        const secretPath = await saveToSecretManager(secretName, apiKey.key)

        await newApiKeyDoc.set({
            secretPath,
            permissions: apiKey.permissions || [],
            name: apiKey.name,
            default: apiKey.default,
            showKey: apiKey.showKey,
            type: apiKey.type,
            created_At: new Date(),
            created_By: userId,
        }, { merge: true })

        return { error: null, apiKeyId: newApiKeyDoc.id, message: "API key created successfully" }
    } catch (error) {
        console.error("Error creating API key:", error)
        // throw new Error("Failed to create API key by id " + apiKeyId)
        return { error, apiKeyId: null, message: "Failed to create API key by id" }
    }
})

export const retrieveMyApiKeysPaging = onCallv2(

    async (req) => {
        const { apiKeyPage, pageSize = 10 } = req.data
        try {
            const userId = req?.auth?.uid
            const page: number = apiKeyPage || 1
            const limit: number = pageSize

            if (!userId) {
                throw new Error("User must be authenticated")
            }

            const apiKeysRef = db.collection(`users/${userId}/apikeys`)
            const apiKeysQuery = apiKeysRef.orderBy("created_At", "desc").limit(limit)

            if (page > 1) {
                const previousLimit = limit * (page - 1)
                const lastDoc = await apiKeysRef.orderBy("created_At", "desc").limit(previousLimit).get()
                const lastDocument = lastDoc.docs[lastDoc.size - 1]
                apiKeysQuery.startAfter(lastDocument)
            }

            const apiKeys = await apiKeysQuery.get()
            const apiKeysData = apiKeys.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

            return { error: null, apiKeys: apiKeysData, message: "API keys retrieved successfully" }
        } catch (error) {
            console.error("Error retrieving API key:", error)
            // throw new Error("Failed to create API key by id " + apiKeyId)
            return { error, apiKeys: null, message: "Failed to retrieve API key by id" }
        }
    })


/**
    before retrieve secret add this policy
    for these accounts: serviceAccount:firebase-adminsdk-ju1ex@libnet-d76db.iam.gserviceaccount.com

    gcloud projects add-iam-policy-binding 332716075857 --member="serviceAccount:libnet-d76db@appspot.gserviceaccount.com"
    --role="roles/secretmanager.secretAccessor"
    --condition="expression=request.time < timestamp('2030-01-01T00:00:00Z'),title=AccessBefore2030,description=Allow access until 2030"

    check available policies
    bash: gcloud iam service-accounts list --project=libnet-d76db
**/
export const getApiKeyDoVisible = onCallv2(async (req) => {
    const { apiKey } = req.data

    try {
        const userId = req?.auth?.uid
        if (!userId) {
            throw new Error("User must be authenticated")
        }

        const apiKeysRef = db.doc(`users/${userId}/apikeys/${apiKey.id}`)
        const key = await apiKeysRef.get()
        const keyData = key.data()

        if (!keyData) {
            throw new Error("API key not found")
        }

        const secretValue = await getSecretFromManager(keyData.secretPath)

        if (!secretValue) {
            throw new Error("cannot retrieve the secret from secret Manager Client")
        }

        const keyDataWithSecret = {
            ...keyData,
            id: apiKey.id,
            key: secretValue,
        }

        return { error: null, apiKey: keyDataWithSecret, message: "API key retrieved successfully" }
    } catch (error) {
        console.error("Error retrieving API key:", error)
        // throw new Error("Failed to create API key by id " + apiKeyId)
        return { error, apiKeyId: null, message: "Failed to retrieve API secret" }
    }
})

export const enqueueCrawlOperation = onDocumentWritten(
    {
        document: "users/{userId}/operations/{operationId}",
        database: dbName,
    },
    async (event) => {
        const after = event.data?.after?.exists ? event.data.after.data() : null
        // check to see if the operation is ready to be processed or to be Scheduled
        if (!after || !(after.status === "Start" || after.status === "Scheduled")) {
            return null // Ignore non-ready or deleted operations
        }
        const operationId = event.params.operationId
        const userId = event.params.userId

        const operation = {
            operationId,
            scheduled_At: after?.scheduled_At,
            status: after.status,
            author: after?.author,
            uid: userId,
            urls: after?.urls,
            modelAI: after?.modelAI,
            metadataId: after?.metadataId,
            prompt: after?.prompt,
        }

        // const { client: redis, release } = await getRedisClient()
        try {
            // const num = await redis.lpush("operation_queue", JSON.stringify(operation))
            // console.log(`Operation ${operationId} queued successfully in position`, num)
            console.log(`Operation ${operationId} queued successfully`, operation)
            return true
        } catch (error) {
            console.error(`Error enqueuing operation ${operationId}:`, error)
            throw new HttpsError("internal", `Error enqueuing operation ${operationId}`)
        } /* finally {
            release() // Always release the client back to the pool
        } */
    }
)

export const getOperationsPaging = onCallv2(

    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            // Early validation
            if (!req?.auth?.uid) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }
            if (currPage < 1 || pageSize < 1) {
                throw new HttpsError("invalid-argument", "Invalid page or size parameters.")
            }

            const userId = req.auth.uid
            const operationsRef = db.collection(`users/${userId}/operations`)

            const [totalSnapshot, firstPageSnapshot] = await Promise.all([
                operationsRef.count().get(),
                operationsRef
                    .orderBy("created_At", "desc")
                    .limit(pageSize)
                    .get(),
            ])

            const inTotal = totalSnapshot.data()?.count || 0
            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)

            // Check if collection exists
            // Early return if no operations
            if (inTotal === 0) {
                return {
                    error: null,
                    operations: [],
                    totalPages: 0,
                    inTotal: 0,
                    message: "No operations found",
                }
            }

            // Validate page number
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", `Page ${currPage} exceeds total pages (${totalPages}).`)
            }

            let operationDocs

            // For first page, use the result we already have
            if (currPage === 1) {
                operationDocs = firstPageSnapshot.docs
            } else {
                // For other pages, get the last document of the previous page
                const lastVisibleDoc = await operationsRef
                    .orderBy("created_At", "desc")
                    .limit((currPage - 1) * pageSize)
                    .get()
                    .then((snap) => snap.docs[snap.size - 1])

                // Get the requested page
                const operationsSnapshot = await operationsRef
                    .orderBy("created_At", "desc")
                    .startAfter(lastVisibleDoc)
                    .limit(pageSize)
                    .get()

                operationDocs = operationsSnapshot.docs
            }

            // Extract operation IDs for metrics lookup
            const operationIds = operationDocs.map((doc) => doc.id)

            // Fetch metrics in batches to avoid potential limitations
            const BATCH_SIZE = 10
            const metricsPromises = []

            for (let i = 0; i < operationIds.length; i += BATCH_SIZE) {
                const batchIds = operationIds.slice(i, i + BATCH_SIZE)
                metricsPromises.push(
                    db.collection("operation_metrics")
                        .where(FieldPath.documentId(), "in", batchIds)
                        .get()
                )
            }

            // Wait for all metrics queries to complete
            const metricsSnapshots = await Promise.all(metricsPromises)

            // Create a map of operation ID to metrics data
            const metricsMap = new Map()
            metricsSnapshots.forEach((snapshot) => {
                snapshot.docs.forEach((doc) => {
                    metricsMap.set(doc.id, doc.data())
                })
            })

            // Merge operations with their metrics
            const operations = operationDocs.map((doc) => {
                const operationData = {
                    id: doc.id,
                    ...doc.data(),
                }

                // Merge metrics data if available
                const metrics = metricsMap.get(doc.id)
                if (metrics) {
                    return {
                        ...operationData,
                        metrics,
                    }
                }

                return operationData
            })

            return {
                error: null,
                operations,
                totalPages,
                inTotal,
                message: "Operations retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving operations:", error)
            throw new HttpsError(
                (error instanceof HttpsError ? error.code : "internal"),
                error instanceof HttpsError ? error.message : "Failed to retrieve operations.",
                error
            )
        }
    })


export const getBrowserProfilesPaging = onCallv2(

    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const profilesRef = db.collection(`users/${userId}/browser`).orderBy("created_At", "desc")

            // Check if collection exists
            const snapshot = await profilesRef.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    profiles: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "Browser Profiles retrieved successfully",
                }
            }

            // Get total count of operations
            const totalBrowserProfilesQuery = await profilesRef.count().get()
            const inTotal = totalBrowserProfilesQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }

            let query = profilesRef.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await profilesRef.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const profilesSnapshot = await query.get()
            const profiles = profilesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                profiles,
                totalPages,
                inTotal,
                message: "Browser Profiles retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving browser profiles paging:", error)
            throw new HttpsError("internal", "Failed to retrieve browser profiles by pagination.")
        }
    })

export const getCrawlConfigsPaging = onCallv2(

    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const configsRef = db.collection(`users/${userId}/crawlconfigs`).orderBy("created_At", "desc")

            // Check if collection exists
            const snapshot = await configsRef.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    configs: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "Crawler Configs retrieved successfully",
                }
            }

            // Get total count of operations
            const totalCrawlConfigsQuery = await configsRef.count().get()
            const inTotal = totalCrawlConfigsQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }

            let query = configsRef.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await configsRef.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const configsSnapshot = await query.get()
            const configs = configsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                configs,
                totalPages,
                inTotal,
                message: "Crawler Configs retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving Crawler Configurations paging:", error)
            throw new HttpsError("internal", "Failed to retrieve Crawler Configurations by pagination.")
        }
    })

export const getCrawlResultConfigsPaging = onCallv2(
    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const configsRef = db.collection(`users/${userId}/crawlresultsconfig`).orderBy("created_At", "desc")

            // Check if collection exists
            const snapshot = await configsRef.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    crawlResultConfigs: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "CrawlResult Configs retrieved successfully",
                }
            }

            // Get total count of operations
            const totalCrawlResultConfigsQuery = await configsRef.count().get()
            const inTotal = totalCrawlResultConfigsQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }

            let query = configsRef.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await configsRef.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const configsSnapshot = await query.get()
            const crawlResultConfigs = configsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                crawlResultConfigs,
                totalPages,
                inTotal,
                message: "CrawlResult Configs retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving CrawlResult Configurations paging:", error)
            throw new HttpsError("internal", "Failed to retrieve CrawlResult Configurations by pagination.")
        }
    })
/*
export const receiveLogs = onRequest(async (request, response) => {
    const authHeader = request.headers.authorization

    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //     return response.status(401).send("Unauthorized")
    // }
    const body = request.body as string

    try {
        // const token = authHeader.split("Bearer ")[1]
        // await adminAuth.verifyIdToken(token) // Validate token


        const logs: string[] = body.split("\n").filter(Boolean) // Split by newlines and filter empty strings
        const logPromises = logs.map((log: any) => {
            const parsedLog = JSON.parse(log)
            // return db.collection(`users/${userId}/logs`).add({
            //     ...parsedLog,
            //     timestamp: Timestamp,
            // })
            return parsedLog
        })

        // Process each log entry
        logs.forEach((log: any) => {
            console.log(log, authHeader) // Log to Firebase Function logs for debugging
            // Optionally, store in Firestore or another database
            // Example: admin.firestore().collection('logs').add(JSON.parse(log))
        })
        await Promise.all(logPromises)
        response.sendStatus(200) // Respond with success
    } catch (error) {
        console.error("Error retrieving the machine logs from fly datadog:", error)
        response.sendStatus(404) // Respond with success
        // throw new HttpsError("internal", "Error retrieving the machine logs from fly datadog")
    }
})
 */

export const getMachinesPaging = onCallv2(
    async (req) => {
        const { currPage = 1, pageSize = 10, state = null } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const machinesRef = db.collection(`users/${userId}/machines`).orderBy("created_at", "desc")
            const filteredQuery = state && typeof state == "string" ? machinesRef.where("state", "==", state) : machinesRef.where("state", "!=", "destroyed")
            // Check if collection exists
            const snapshot = await filteredQuery.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    machines: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "Machines retrieved successfully",
                }
            }

            // Get total count of operations
            const totalMachinesQuery = await filteredQuery.count().get()
            const inTotal = totalMachinesQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages && totalPages > 0) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }


            let query = filteredQuery.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await filteredQuery.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const machinesSnapshot = await query.get()
            const machines = machinesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                machines,
                totalPages,
                inTotal,
                message: "Machines retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving the machines:", error)
            throw new HttpsError("internal", "Error retrieving the machines", error)
        }
    })
