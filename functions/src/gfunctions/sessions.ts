/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { onCall } from "firebase-functions/v2/https"
import { Timestamp } from "firebase-admin/firestore"
import { Resend } from "resend"
import { db, dbName, auth as adminAuth } from "../app/config"
import { env } from "../config/env"
import { redis } from "../app/cacheConfig"

const DATABASE_NAME = dbName || "easyscrape"

/**
 * Enterprise login session management with device tracking,
 * revocation handling, and Redis caching for performance.
 */

/**
 * Cloud Function: Create a new login session (called after user auth success)
 * Atomically creates Firestore doc + Redis cache entry
 */
export const createLoginSession = onCall(
  {
    cors: true,
    secrets: [],
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { userId, deviceId, metrics } = request.data as {
            userId: string
            deviceId: string
            metrics: {
                ip: string
                userAgent: string
                browser: string
                os: string
                location: string
                providerId: string
            }
        }

    const auth = request.auth
    if (!auth || auth.uid !== userId) {
      throw new Error("Unauthorized: Only authenticated users can create their own sessions")
    }

    if (!userId || !deviceId || !metrics) {
      throw new Error("Missing required sessionoptions: userId, deviceId, metrics")
    }

    try {
      const now = new Date()
      const sessionId = `${userId}-${deviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create session record
      const sessionData = {
        sessionId,
        userId,
        deviceId,
        createdAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
        revokedAt: null,
        active: true,
        ipAddress: metrics.ip,
        userAgent: metrics.userAgent,
        browser: metrics.browser,
        os: metrics.os,
        location: metrics.location,
        providerId: metrics.providerId,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }

      // Write to Firestore in batch with login_metrics for backwards compat
      const batch = db.batch()
      const sessionRef = db.collection("loginSessions").doc(sessionId)
      batch.set(sessionRef, sessionData)

      // Also add to user's sessionSubcollection for easy querying
      const userSessionRef = db.doc(`users/${userId}`).collection("sessions").doc(sessionId)
      batch.set(userSessionRef, {
        ...sessionData,
        syncedAt: Timestamp.now(),
      })

      await batch.commit()

      // Cache in Redis (fast path for heartbeat validation)
      const sessionCacheKey = `session:${sessionId}`
      const sessionTtl = 30 * 60 // 30 minutes
      await redis.setex(sessionCacheKey, sessionTtl, JSON.stringify({
        ...sessionData,
        createdAt: sessionData.createdAt.toDate().toISOString(),
        lastActivityAt: sessionData.lastActivityAt.toDate().toISOString(),
        expiresAt: sessionData.expiresAt.toISOString(),
      }))

      console.log(`✅ Session ${sessionId} created for user ${userId}`)

      return {
        success: true,
        sessionId,
        expiresAt: sessionData.expiresAt.toISOString(),
      }
    } catch (error) {
      console.error("❌ Error creating login session:", error)
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

/**
 * Cloud Function: Revoke a login session (called from security tab)
 */
export const revokeMyLoginSession = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { loginId, reason } = request.data as { loginId: string, reason?: string }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized: You must be authenticated to revoke sessions")
    }

    if (!loginId) {
      throw new Error("Missing required field: loginId")
    }

    try {
      const userId = auth.uid
      const revokedAt = Timestamp.now()

      // Get the session to verify ownership
      const sessionDoc = await db.collection("loginSessions").doc(loginId).get()
      if (!sessionDoc.exists) {
        throw new Error("Session not found")
      }

      const sessionData = sessionDoc.data()
      // PHASE 2.1: RBAC - Prevent cross-user revocation
      if (sessionData?.userId !== userId) {
        throw new Error("Unauthorized: You can only revoke your own sessions")
      }

      // PHASE 2.1: Check if requester is admin (for audit trail)
      const tokenRole = typeof auth.token.role === "string" ? auth.token.role : undefined
      const isAdmin = tokenRole === "admin"

      // Update Firestore
      const batch = db.batch()
      const sessionRef = db.collection("loginSessions").doc(loginId)
      batch.update(sessionRef, {
        revokedAt,
        active: false,
        revokedBy: userId,
        revokedByRole: isAdmin ? "admin" : "user",
        revokeReason: reason || "user_initiated_revoke",
      })

      // Also update user subcollection
      const userSessionRef = db.doc(`users/${userId}`).collection("sessions").doc(loginId)
      batch.update(userSessionRef, {
        revokedAt,
        active: false,
        syncedAt: Timestamp.now(),
      })

      const loginHistoryEventRef = db
        .collection("login_metrics")
        .doc(userId)
        .collection("login_history_events")
        .doc()
      batch.set(loginHistoryEventRef, {
        uid: userId,
        eventType: "revoke",
        eventSessionId: loginId,
        providerId: sessionData?.providerId || "firebase",
        browser: sessionData?.browser || "",
        os: sessionData?.os || "",
        userAgent: sessionData?.userAgent || "",
        ipAddress: sessionData?.ipAddress || "",
        location: sessionData?.location || "",
        connected: false,
        revokedAt,
        revokedByUid: userId,
        createdAt: revokedAt,
      })

      await batch.commit()

      // Cache revocation in Redis (long TTL for audit trail)
      const revocationCacheKey = `revoked:${loginId}`
      const revocationTtl = 30 * 24 * 60 * 60 // 30 days
      await redis.setex(revocationCacheKey, revocationTtl, JSON.stringify({
        revokedAt: revokedAt.toDate().toISOString(),
        userId,
      }))

      // Also invalidate the session cache
      await redis.del(`session:${loginId}`)

      // PHASE 2.1: Add audit log entry for all revocations (user or admin)
      try {
        await db.collection("audit_logs").add({
          action: isAdmin ? "admin_revoke_session" : "user_revoke_session",
          admin_uid: userId,
          target_loginId: loginId,
          target_userId: sessionData?.userId,
          reason: reason || (isAdmin ? "admin_action" : "user_action"),
          timestamp: Timestamp.now(),
          isAdmin,
        })
      } catch (auditErr) {
        console.warn("Failed to write audit log:", auditErr)
        // Continue despite audit log failure - revocation still successful
      }

      console.log(`✅ Session ${loginId} revoked for user ${userId}${isAdmin ? " by admin" : ""}`)

      return {
        success: true,
        loginId,
        revokedAt: revokedAt.toDate().toISOString(),
      }
    } catch (error) {
      console.error("❌ Error revoking session:", error)
      throw new Error(`Failed to revoke session: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  })

async function performSessionSignOut(userId: string, loginId: string, signOutReason: string) {
  const signedOutAt = Timestamp.now()

  const sessionRef = db.collection("loginSessions").doc(loginId)
  const sessionDoc = await sessionRef.get()

  if (!sessionDoc.exists) {
    throw new Error("Session not found")
  }

  const sessionData = sessionDoc.data()
  if (sessionData?.userId !== userId) {
    throw new Error("Unauthorized: Can only sign out own sessions")
  }

  const batch = db.batch()

  batch.set(sessionRef, {
    active: false,
    signedOutAt,
    signOutReason,
  }, {merge: true})

  const userSessionRef = db.doc(`users/${userId}`).collection("sessions").doc(loginId)
  batch.set(userSessionRef, {
    active: false,
    signedOutAt,
    syncedAt: Timestamp.now(),
  }, {merge: true})

  const legacyRef = db.doc(`login_metrics/${userId}/login_history_Info/${loginId}`)
  batch.set(legacyRef, {
    connected: false,
    signOutTime: signedOutAt,
  }, {merge: true})

  const loginHistoryEventRef = db
    .collection("login_metrics")
    .doc(userId)
    .collection("login_history_events")
    .doc()
  batch.set(loginHistoryEventRef, {
    uid: userId,
    eventType: "logout",
    eventSessionId: loginId,
    providerId: sessionData?.providerId || "firebase",
    browser: sessionData?.browser || "",
    os: sessionData?.os || "",
    userAgent: sessionData?.userAgent || "",
    ipAddress: sessionData?.ipAddress || "",
    location: sessionData?.location || "",
    connected: false,
    signOutTime: signedOutAt,
    createdAt: signedOutAt,
  })

  await batch.commit()

  await redis.del(`session:${loginId}`)

  const signedOutCacheKey = `signed-out:${loginId}`
  await redis.setex(signedOutCacheKey, 86400, JSON.stringify({
    signedOutAt: signedOutAt.toDate().toISOString(),
    userId,
  }))

  return {
    loginId,
    signedOutAt,
  }
}
/**
       * PHASE 1.2: Cloud Function: Sign out a login session
       * Called when user explicitly logs out (different from forced revocation)
       * Marks session as signed_out and invalidates Redis cache immediately
       */
export const signOutLoginSession = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { loginId } = request.data as { loginId: string }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized: You must be authenticated to sign out")
    }

    if (!loginId) {
      throw new Error("Missing required field: loginId")
    }

    try {
      const userId = auth.uid
      const result = await performSessionSignOut(userId, loginId, "user_initiated_logout")

      console.log(`✅ Session ${loginId} signed out for user ${userId}`)

      return {
        success: true,
        loginId,
        signedOutAt: result.signedOutAt.toDate().toISOString(),
      }
    } catch (error) {
      console.error("❌ Error signing out session:", error)
      throw new Error(`Failed to sign out session: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

/**
       * Cloud Function: Get login session status
       */
export const getMyLoginSessionStatus = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { loginId } = request.data as { loginId: string }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized")
    }

    if (!loginId) {
      throw new Error("Missing required field: loginId")
    }

    try {
      const userId = auth.uid

      // Check Redis cache first (fast path)
      const cachedRevoked = await redis.get(`revoked:${loginId}`)
      if (cachedRevoked && typeof cachedRevoked === "string") {
        const revocationData = JSON.parse(cachedRevoked)
        return {
          loginId,
          active: false,
          revoked: true,
          revokedAt: revocationData.revokedAt,
        }
      }

      // Fall back to Firestore
      const sessionDoc = await db.collection("loginSessions").doc(loginId).get()
      if (!sessionDoc.exists) {
        return {
          loginId,
          active: false,
          revoked: true,
          revokedAt: null,
          message: "Session not found",
        }
      }

      const sessionData = sessionDoc.data()

      // Verify ownership
      if (sessionData?.userId !== userId) {
        throw new Error("Unauthorized: Invalid session for user")
      }

      return {
        loginId,
        active: sessionData?.active === true && !sessionData?.revokedAt,
        revoked: sessionData?.revokedAt !== null,
        revokedAt: sessionData?.revokedAt ? sessionData.revokedAt.toDate().toISOString() : null,
      }
    } catch (error) {
      console.error("❌ Error getting session status:", error)
      throw new Error(`Failed to get session status: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

/**
       * PHASE 3.2: Cloud Function: Record logout metrics atomically
       * Updates both loginSessions and login_history_Info collections and invalidates Redis
       * Called when user explicitly logs out
       */
export const recordLogoutMetrics = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { loginId } = request.data as { loginId: string }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized: You must be authenticated")
    }

    if (!loginId) {
      throw new Error("Missing required field: loginId")
    }

    try {
      const userId = auth.uid
      const result = await performSessionSignOut(userId, loginId, "user_initiated_logout")

      console.log(`✅ Logout metrics recorded for session ${loginId}`)

      return {
        success: true,
        loginId,
        signedOutAt: result.signedOutAt.toDate().toISOString(),
      }
    } catch (error) {
      console.error("❌ Error recording logout metrics:", error)
      throw new Error(`Failed to record logout metrics: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

/**
       * Cloud Function: Get all active login sessions for the user
       */
export const getMyLoginSessions = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { limit = 50 } = request.data as { limit?: number }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized")
    }

    try {
      const userId = auth.uid
      const queryLimit = Math.min(limit, 100) // Cap at 100

      // Query from user's sessions subcollection (more efficient)
      const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("sessions")
        .where("active", "==", true)
        .orderBy("lastActivityAt", "desc")
        .limit(queryLimit)
        .get()

      const sessions = snapshot.docs.map((doc) => ({
        loginId: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || doc.data().createdAt,
        lastActivityAt: doc.data().lastActivityAt?.toDate?.()?.toISOString?.() || doc.data().lastActivityAt,
        expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString?.() || doc.data().expiresAt,
      }))

      return {
        success: true,
        sessions,
        total: sessions.length,
      }
    } catch (error) {
      console.error("❌ Error getting login sessions:", error)
      throw new Error(`Failed to get sessions: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

/**
       * Validate session cookie and update activity (called from heartbeat)
       */
export const validateSessionCookie = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { sessionId } = request.data as { sessionId: string }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized")
    }

    if (!sessionId) {
      throw new Error("Missing sessionId")
    }

    try {
      const userId = auth.uid

      // Check revocation cache first (fastest)
      const cachedRevoked = await redis.get(`revoked:${sessionId}`)
      if (cachedRevoked) {
        return { valid: false, reason: "revoked" }
      }

      // Check session cache
      const cachedSession = await redis.get(`session:${sessionId}`)
      if (cachedSession && typeof cachedSession === "string") {
        try {
          const sessionData = JSON.parse(cachedSession)
          if (sessionData.userId === userId && sessionData.active) {
            // Update activity and TTL in cache
            await redis.setex(`session:${sessionId}`, 30 * 60, cachedSession)
            return { valid: true, cachedHit: true }
          }
        } catch (e) {
          // Fallthrough to Firestore
        }
      }

      // Query Firestore
      const sessionDoc = await db.collection("loginSessions").doc(sessionId).get()
      if (!sessionDoc.exists) {
        return { valid: false, reason: "not_found" }
      }

      const sessionData = sessionDoc.data()
      if (sessionData?.userId !== userId) {
        return { valid: false, reason: "user_mismatch" }
      }

      if (sessionData?.revokedAt) {
        return { valid: false, reason: "revoked" }
      }

      if (sessionData?.active === false) {
        return { valid: false, reason: "inactive" }
      }

      const expiresAt = sessionData?.expiresAt
      if (expiresAt && new Date() > new Date(expiresAt)) {
        return { valid: false, reason: "expired" }
      }

      // Update lastActivityAt
      const now = Timestamp.now()
      const batch = db.batch()
      const sessionRef = db.collection("loginSessions").doc(sessionId)
      batch.update(sessionRef, { lastActivityAt: now })

      const userSessionRef = db.doc(`users/${userId}`).collection("sessions").doc(sessionId)
      batch.update(userSessionRef, { lastActivityAt: now, syncedAt: now })

      await batch.commit()

      // Refresh Redis cache
      const refreshedData = {
        ...sessionData,
        lastActivityAt: now.toDate().toISOString(),
      }
      await redis.setex(`session:${sessionId}`, 30 * 60, JSON.stringify(refreshedData))

      return { valid: true }
    } catch (error) {
      console.error("❌ Error validating session:", error)
      return { valid: false, reason: "server_error" }
    }
  },
)

/**
       * Scheduled function: Clean up expired sessions daily
       * Removes sessions older than 30 days with revokedAt set
       */
export const cleanupExpiredSessions = onSchedule(
  {
    schedule: "every day 02:00",
    timeZone: "UTC",
    region: "us-central1",
  },
  async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgoTs = Timestamp.fromDate(thirtyDaysAgo)

      // Find revoked sessions older than 30 days
      const snapshot = await db
        .collection("loginSessions")
        .where("revokedAt", "<", thirtyDaysAgoTs)
        .limit(100)
        .get()

      let deletedCount = 0
      const batch = db.batch()

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
        deletedCount++

        // Also delete from user subcollection
        const userId = doc.data().userId
        const sessionId = doc.id
        const userSessionRef = db.doc(`users/${userId}`).collection("sessions").doc(sessionId)
        batch.delete(userSessionRef)
      })

      if (snapshot.size > 0) {
        await batch.commit()
        console.log(`✅ Cleaned up ${deletedCount} expired sessions`)
      } else {
        console.log("ℹ️ No expired sessions to clean up")
      }
    } catch (error) {
      console.error("❌ Error cleaning up sessions:", error)
    }
  },
)

/**
           * Trigger: Update session lastActivityAt when new login history is recorded
           * Keeps loginSession in sync with activity
           */
export const onLoginHistoryCreated = onDocumentWritten(
  {
    document: "login_metrics/{userId}/login_history_Info/{loginId}",
    database: DATABASE_NAME,
  },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()

    // Only process creates (no before data) or updates that set connected: true
    if (before || !after) return

    try {
      const loginId = event.params.loginId

      // Check if corresponding loginSession exists
      const sessionDoc = await db.collection("loginSessions").doc(loginId).get()
      if (sessionDoc.exists) {
        // Update lastActivityAt in loginSession
        await sessionDoc.ref.update({
          lastActivityAt: Timestamp.now(),
        })
      }

      console.log(`ℹ️ Updated session activity for ${loginId}`)
    } catch (error) {
      console.error("❌ Error updating session activity:", error)
      // Don't throw - let the trigger succeed even if update fails
    }
  },
)

/**
       * PHASE 4.2: Cloud Function: Send device verification code
       * Generates a 6-digit code and sends via email or SMS
       * Code expires in 10 minutes
       */
export const sendDeviceVerificationCode = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    const { userId, method } = request.data as { userId: string; method: "email" | "sms" }
    const auth = request.auth

    if (!auth || auth.uid !== userId) {
      throw new Error("Unauthorized: Can only request code for own account")
    }

    if (!userId || !method) {
      throw new Error("Missing required fields: userId, method")
    }

    if (!["email", "sms"].includes(method)) {
      throw new Error("Invalid method: must be 'email' or 'sms'")
    }

    try {
      const userRecord = await adminAuth.getUser(userId)
      const enrolledFactors = userRecord.multiFactor?.enrolledFactors || []
      const phoneMfaFactor = enrolledFactors.find((factor) => factor.factorId === "phone")
      const hasMfaEnabled = enrolledFactors.length > 0
      const hasPhoneNumber = typeof userRecord.phoneNumber === "string" && userRecord.phoneNumber.length > 0
      const hasPhoneMfa = !!phoneMfaFactor

      if (method === "email" && !userRecord.email) {
        throw new Error("No email found on account. Add an email first.")
      }

      if (method === "sms" && !hasPhoneNumber && !hasPhoneMfa) {
        throw new Error("No phone number or phone MFA factor found. Add phone number or enable MFA first.")
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      const expiresAtTs = Timestamp.fromDate(expiresAt)

      // Store verification attempt in Firestore
      const verificationRef = db.collection("device_verifications").doc()
      await verificationRef.set({
        userId,
        code: verificationCode,
        method,
        expiresAt: expiresAtTs,
        createdAt: Timestamp.now(),
        verified: false,
        attempts: 0,
      })

      // Store in Redis for fast lookup (expires in 10 minutes)
      const verificationCacheKey = `verification:${userId}:${method}`
      await redis.setex(verificationCacheKey, 600, JSON.stringify({
        code: verificationCode,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      }))

      let deliveryStatus: "sent" | "pending_client_mfa"
      let deliveryMessage = ""

      if (method === "email") {
        const resendApiKey = env.RESEND_API_KEY
        const resendFromEmail = env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

        if (!resendApiKey) {
          throw new Error("RESEND_API_KEY is not configured")
        }

        const resend = new Resend(resendApiKey)
        await resend.emails.send({
          from: resendFromEmail,
          to: userRecord.email as string,
          subject: "Your device verification code",
          text: `Your verification code is ${verificationCode}. It expires in 10 minutes.`,
        })

        deliveryStatus = "sent"
        deliveryMessage = "Verification code sent via email"
      } else {
        // Firebase Admin SDK cannot directly send SMS OTP.
        // For SMS verification, frontend should use Firebase phone auth / MFA challenge flow.
        deliveryStatus = "pending_client_mfa"
        deliveryMessage = hasPhoneMfa ?
          "Use your enrolled phone MFA challenge to retrieve and verify the code" :
          "Use Firebase phone verification flow for your saved phone number"
      }

      console.log(`✅ Verification code generated for ${userId} via ${method}`)

      return {
        success: true,
        expiresAt: expiresAt.toISOString(),
        message: deliveryMessage,
        deliveryStatus,
        hasPhoneNumber,
        hasMfaEnabled,
      }
    } catch (error) {
      console.error("❌ Error sending verification code:", error)
      throw new Error(
        `Failed to send verification code: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  },
)

/**
           * PHASE 4.2: Cloud Function: Verify code and trust device
           * Validates the verification code and adds device to trusted list
           */
/**
       * PHASE 4.2: Cloud Function: Verify code and trust device
       * Validates the verification code and adds device to trusted list
       */
export const verifyAndTrustDevice = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { userId, code, deviceId, deviceName } = request.data as {
                        userId: string
                        code: string
                        deviceId: string
                        deviceName: string
                    }
    const auth = request.auth

    if (!auth || auth.uid !== userId) {
      throw new Error("Unauthorized: Can only verify for own account")
    }

    if (!userId || !code || !deviceId) {
      throw new Error("Missing required fields: userId, code, deviceId")
    }

    try {
      // Find the verification attempt
      const snapshot = await db
        .collection("device_verifications")
        .where("userId", "==", userId)
        .where("verified", "==", false)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()

      if (snapshot.empty) {
        throw new Error("No pending verification found")
      }

      const verificationDoc = snapshot.docs[0]
      const verificationData = verificationDoc.data()

      // Check expiration
      if (new Date() > verificationData.expiresAt.toDate()) {
        throw new Error("Verification code expired")
      }

      // Verify code
      if (verificationData.code !== code) {
        // Increment attempts
        await verificationDoc.ref.update({
          attempts: (verificationData.attempts || 0) + 1,
        })

        // Lock after 5 wrong attempts
        if ((verificationData.attempts || 0) >= 4) {
          await verificationDoc.ref.update({ verified: false })
          throw new Error("Too many failed attempts. Please request a new code.")
        }

        throw new Error("Invalid verification code")
      }

      // Mark verification as complete
      await verificationDoc.ref.update({ verified: true })

      // Add device to trusted devices
      const trustedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      const trustedUntilTs = Timestamp.fromDate(trustedUntil)

      const trustedDeviceRef = db
        .collection("users")
        .doc(userId)
        .collection("trusted_devices")
        .doc(deviceId)

      await trustedDeviceRef.set({
        deviceId,
        deviceName: deviceName || "Trusted Device",
        trustedAt: Timestamp.now(),
        trustedUntil: trustedUntilTs,
        lastUsedAt: Timestamp.now(),
        browser: "", // Will be filled by client
        os: "", // Will be filled by client
        location: "",
      })

      // Cache in Redis
      const trustedDeviceKey = `trusted:${userId}:${deviceId}`
      await redis.setex(trustedDeviceKey, 90 * 24 * 60 * 60, JSON.stringify({
        deviceId,
        trustedAt: new Date().toISOString(),
        trustedUntil: trustedUntil.toISOString(),
      }))

      // Invalidate verification cache
      await redis.del(`verification:${userId}:email`)
      await redis.del(`verification:${userId}:sms`)

      console.log(`✅ Device ${deviceId} trusted for user ${userId}`)

      return {
        success: true,
        deviceId,
        trustedUntil: trustedUntil.toISOString(),
      }
    } catch (error) {
      console.error("❌ Error verifying device:", error)
      throw new Error(`Failed to verify device: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

/**
           * PHASE 4.2: Cloud Function: Check if device is trusted
           */
export const isDeviceTrusted = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { userId, deviceId } = request.data as { userId: string; deviceId: string }
    const auth = request.auth

    if (!auth || auth.uid !== userId) {
      throw new Error("Unauthorized")
    }

    if (!userId || !deviceId) {
      throw new Error("Missing required fields: userId, deviceId")
    }

    try {
      // Check Redis cache first
      const cachedTrust = await redis.get(`trusted:${userId}:${deviceId}`)
      if (cachedTrust && typeof cachedTrust === "string") {
        const trustData = JSON.parse(cachedTrust)
        if (new Date() < new Date(trustData.trustedUntil)) {
          return { trusted: true, cachedHit: true }
        }
      }

      // Query Firestore
      const trustedDeviceDoc = await db
        .collection("users")
        .doc(userId)
        .collection("trusted_devices")
        .doc(deviceId)
        .get()

      if (!trustedDeviceDoc.exists) {
        return { trusted: false }
      }

      const deviceData = trustedDeviceDoc.data()
      if (deviceData?.trustedUntil && new Date() > deviceData.trustedUntil.toDate()) {
        // Trust expired, delete it
        await trustedDeviceDoc.ref.delete()
        return { trusted: false }
      }

      // Update lastUsedAt
      await trustedDeviceDoc.ref.update({ lastUsedAt: Timestamp.now() })

      // Refresh Redis cache
      const trustedUntil = deviceData?.trustedUntil || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      await redis.setex(`trusted:${userId}:${deviceId}`, 90 * 24 * 60 * 60, JSON.stringify({
        deviceId,
        trustedAt: new Date().toISOString(),
        trustedUntil: trustedUntil.toDate?.()?.toISOString?.() || trustedUntil,
      }))

      return { trusted: true }
    } catch (error) {
      console.error("❌ Error checking device trust:", error)
      return { trusted: false, error: "server_error" }
    }
  },
)

/**
           * PHASE 4.2: Cloud Function: Get trusted devices list
           */
export const getTrustedDevices = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized")
    }

    try {
      const userId = auth.uid

      const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("trusted_devices")
        .where("trustedUntil", ">", Timestamp.now())
        .orderBy("lastUsedAt", "desc")
        .get()

      const devices = snapshot.docs.map((doc) => ({
        deviceId: doc.id,
        ...doc.data(),
        trustedAt: doc.data().trustedAt?.toDate?.()?.toISOString?.() || doc.data().trustedAt,
        trustedUntil: doc.data().trustedUntil?.toDate?.()?.toISOString?.() || doc.data().trustedUntil,
        lastUsedAt: doc.data().lastUsedAt?.toDate?.()?.toISOString?.() || doc.data().lastUsedAt,
      }))

      return { success: true, devices }
    } catch (error) {
      console.error("❌ Error getting trusted devices:", error)
      throw new Error(`Failed to get devices: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

/**
           * PHASE 4.2: Cloud Function: Remove trusted device
           */
export const removeTrustedDevice = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { deviceId } = request.data as { deviceId: string }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized")
    }

    if (!deviceId) {
      throw new Error("Missing required field: deviceId")
    }

    try {
      const userId = auth.uid

      await db
        .collection("users")
        .doc(userId)
        .collection("trusted_devices")
        .doc(deviceId)
        .delete()

      // Invalidate cache
      await redis.del(`trusted:${userId}:${deviceId}`)

      console.log(`✅ Trusted device ${deviceId} removed for user ${userId}`)

      return { success: true }
    } catch (error) {
      console.error("❌ Error removing trusted device:", error)
      throw new Error(`Failed to remove device: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)
