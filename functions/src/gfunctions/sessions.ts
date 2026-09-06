/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { onCall } from "firebase-functions/v2/https"
import { Timestamp } from "firebase-admin/firestore"
import { Resend } from "resend"
import { db, dbName, auth as adminAuth } from "../app/config"
import { env, functionsEnvJson } from "../config/env"
import { redis } from "../app/cacheConfig"
import { GeoLookupRequestContext, lookupGeoByIp, normalizeGeoLookupRoles, normalizePublicIp } from "./analytics"

const DATABASE_NAME = dbName || "easyscrape"

type ResolvedSessionGeo = {
  ip: string
  location: string
  region: string
  country: string
  latitude: number | null
  longitude: number | null
  timezone: string
  asn: string | null
  as: string | null
  isp: string | null
  domain: string | null
  usageType: string | null
  proxy: {
    isProxy: boolean
    proxyType: string | null
    threat: string | null
    lastSeenDays: number | null
    provider: string | null
    fraudScore: number | null
    confidence: "none" | "open-proxy-detected" | "unknown"
  }
}

type SessionGeoEnrichmentStatus = "pending" | "resolved" | "no-match" | "skipped"
type GuestGeoEnrichmentStatus = "pending" | "resolved" | "no-match" | "skipped"

const SESSION_CACHE_TTL_SECONDS = 30 * 60

async function updateSessionRedisCache(sessionId: string, patch: Record<string, unknown>): Promise<void> {
  try {
    const cacheKey = `session:${sessionId}`
    const cached = await redis.get(cacheKey)
    if (typeof cached !== "string" || !cached) {
      return
    }

    const parsed = JSON.parse(cached) as Record<string, unknown>
    const merged = {
      ...parsed,
      ...patch,
    }

    await redis.setex(cacheKey, SESSION_CACHE_TTL_SECONDS, JSON.stringify(merged))
  } catch (error) {
    console.warn(`Failed to update Redis session cache for ${sessionId}:`, error)
  }
}

type MfaPreferredMethod = "totp" | "sms" | "email"

type MfaSecurityPreferences = {
  primaryMethod: MfaPreferredMethod
  secondaryMethod: MfaPreferredMethod | null
  riskEmailNotifications: boolean
  updatedAt: string
}

type AvailableMfaMethods = {
  totp: boolean
  sms: boolean
  email: boolean
}

type MfaDisabledNotificationEvaluation = {
  shouldNotify: boolean
  reason: "notify" | "mfa_still_enabled" | "risk_email_notifications_disabled" | "missing_email"
}

export const getDefaultPrimaryMethod = (available: AvailableMfaMethods): MfaPreferredMethod => {
  if (available.totp) return "totp"
  if (available.sms) return "sms"
  return "email"
}

export const getDefaultSecondaryMethod = (
  available: AvailableMfaMethods,
  primary: MfaPreferredMethod,
): MfaPreferredMethod | null => {
  if (primary !== "sms" && available.sms) return "sms"
  if (primary !== "email" && available.email) return "email"
  if (primary !== "totp" && available.totp) return "totp"
  return null
}

export const isMethodAvailable = (available: AvailableMfaMethods, method: MfaPreferredMethod): boolean => {
  if (method === "totp") return available.totp
  if (method === "sms") return available.sms
  return available.email
}

export const normalizePreferredMethod = (
  value: unknown,
  fallback: MfaPreferredMethod,
): MfaPreferredMethod => {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "totp" || normalized === "sms" || normalized === "email") {
    return normalized
  }
  return fallback
}

export const readMfaPreferences = (
  userData: Record<string, unknown> | undefined,
  available: AvailableMfaMethods,
): MfaSecurityPreferences => {
  const securitySettings = (
    (userData?.settings as { security?: { mfa?: Partial<MfaSecurityPreferences> } })?.security?.mfa || {}
  ) as Partial<MfaSecurityPreferences>

  const defaultPrimary = getDefaultPrimaryMethod(available)
  const primaryCandidate = normalizePreferredMethod(securitySettings.primaryMethod, defaultPrimary)
  const primaryMethod = isMethodAvailable(available, primaryCandidate) ? primaryCandidate : defaultPrimary

  const secondaryCandidate = securitySettings.secondaryMethod ?
    normalizePreferredMethod(securitySettings.secondaryMethod, primaryMethod) : null
  const secondaryMethod = secondaryCandidate && secondaryCandidate !== primaryMethod &&
    isMethodAvailable(available, secondaryCandidate) ? secondaryCandidate :
    getDefaultSecondaryMethod(available, primaryMethod)

  return {
    primaryMethod,
    secondaryMethod,
    riskEmailNotifications: securitySettings.riskEmailNotifications !== false,
    updatedAt: typeof securitySettings.updatedAt === "string" ? securitySettings.updatedAt : new Date().toISOString(),
  }
}

export const resolveAvailableMfaMethods = (
  userRecord: { email?: string | null; phoneNumber?: string | null; multiFactor?: { enrolledFactors?: Array<{ factorId?: string | null }> } },
): AvailableMfaMethods => {
  const enrolledFactors = userRecord.multiFactor?.enrolledFactors || []
  const hasTotpFactor = enrolledFactors.some((factor) => factor.factorId === "totp")
  const hasPhoneFactor = enrolledFactors.some((factor) => factor.factorId === "phone")

  return {
    totp: hasTotpFactor,
    sms: hasPhoneFactor || (typeof userRecord.phoneNumber === "string" && userRecord.phoneNumber.length > 0),
    email: typeof userRecord.email === "string" && userRecord.email.length > 0,
  }
}

export const evaluateMfaDisabledNotification = (args: {
  hasEnrolledMfa: boolean
  riskEmailNotifications: boolean
  hasEmail: boolean
}): MfaDisabledNotificationEvaluation => {
  if (args.hasEnrolledMfa) {
    return { shouldNotify: false, reason: "mfa_still_enabled" }
  }

  if (!args.riskEmailNotifications) {
    return { shouldNotify: false, reason: "risk_email_notifications_disabled" }
  }

  if (!args.hasEmail) {
    return { shouldNotify: false, reason: "missing_email" }
  }

  return { shouldNotify: true, reason: "notify" }
}

const buildMfaDisabledEmailHtml = (): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MFA disabled</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 8px 32px;text-align:center;">
              <div style="width:48px;height:48px;background-color:#dc2626;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="color:#fff;font-size:24px;line-height:48px;">\\u26A0\\uFE0F</span>
              </div>
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#111318;letter-spacing:-0.3px;">Security alert</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#5f6b7a;line-height:1.5;">
                Multi-factor authentication was disabled on your account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;">
              <div style="background:#fef2f2;border-radius:12px;padding:16px;border:1px solid #fecaca;">
                <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.5;">
                  Your account is now at higher risk. Re-enable an authenticator app (recommended) or SMS/Text message in Security settings as soon as possible.
                </p>
              </div>
              <hr style="border:none;border-top:1px solid #e9edf2;margin:16px 0;">
              <p style="margin:0;font-size:12px;color:#8a95a6;text-align:center;">
                If you didn\\'t make this change, secure your account immediately and contact support.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0 0;font-size:11px;color:#b0b8c4;text-align:center;">
          Deepscrape \\u2022 Security notice
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

const buildVerificationEmailHtml = (code: string, expiresInMin = 10): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 8px 32px;text-align:center;">
              <div style="width:48px;height:48px;background-color:#0891b2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="color:#fff;font-size:24px;line-height:48px;">\u{1F512}</span>
              </div>
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#111318;letter-spacing:-0.3px;">Verify your sign-in</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#5f6b7a;line-height:1.5;">
                Enter this code to complete the verification step.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <div style="background:#f0f4f8;border-radius:12px;padding:20px 16px;letter-spacing:8px;font-size:36px;font-weight:800;color:#0891b2;font-family:ui-monospace,'SF Mono',Monaco,monospace;">
                ${code}
              </div>
              <p style="margin:16px 0 0 0;font-size:13px;color:#8a95a6;">This code expires in ${expiresInMin} minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <hr style="border:none;border-top:1px solid #e9edf2;margin:0 0 16px 0;">
              <p style="margin:0;font-size:12px;color:#8a95a6;text-align:center;">
                If you didn\\'t request this code, someone else may be trying to access your account.
                <br>Please secure your account or contact support.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0 0;font-size:11px;color:#b0b8c4;text-align:center;">
          Deepscrape \u2022 Security notice
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

const sendSecurityNoticeEmail = async (args: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<void> => {
  const resendApiKey = env.RESEND_API_KEY
  const resendFromEmail = env.RESEND_FROM_EMAIL || "security@deepscrape.dev"
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  const resend = new Resend(resendApiKey)
  await resend.emails.send({
    from: resendFromEmail,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  })
}

const writeSecurityAuditAndTimeline = async (args: {
  userId: string
  action: string
  eventType: string
  message: string
  metadata?: Record<string, unknown>
}): Promise<void> => {
  const now = Timestamp.now()

  await Promise.all([
    db.collection("audit_logs").add({
      action: args.action,
      admin_uid: args.userId,
      target_userId: args.userId,
      reason: args.message,
      timestamp: now,
      isAdmin: false,
      metadata: args.metadata || {},
    }),
    db
      .collection("login_metrics")
      .doc(args.userId)
      .collection("login_history_events")
      .doc()
      .set({
        uid: args.userId,
        eventType: args.eventType,
        providerId: "security",
        browser: "",
        os: "",
        userAgent: "",
        ipAddress: "",
        location: "",
        connected: false,
        createdAt: now,
        metadata: {
          message: args.message,
          ...(args.metadata || {}),
        },
      }),
  ])
}

function getRequestIp(request: unknown): string {
  const rawRequest = (request as { rawRequest?: { headers?: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string } } })?.rawRequest
  const forwarded = rawRequest?.headers?.["x-forwarded-for"]
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded

  return normalizePublicIp(forwardedValue || rawRequest?.ip || rawRequest?.socket?.remoteAddress || "")
}

async function resolveSessionGeo(request: unknown, fallbackIp: string): Promise<ResolvedSessionGeo> {
  const requestIp = getRequestIp(request)
  const normalizedFallbackIp = normalizePublicIp(fallbackIp)
  const lookupIp = requestIp || normalizedFallbackIp

  const fallback: ResolvedSessionGeo = {
    ip: lookupIp || "0.0.0.0",
    location: "Unknown",
    region: "Unknown",
    country: "Unknown",
    latitude: null,
    longitude: null,
    timezone: "UTC",
    asn: null,
    as: null,
    isp: null,
    domain: null,
    usageType: null,
    proxy: {
      isProxy: false,
      proxyType: null,
      threat: null,
      lastSeenDays: null,
      provider: null,
      fraudScore: null,
      confidence: "unknown",
    },
  }

  if (!lookupIp) {
    return fallback
  }

  const normalizedLookupIp = lookupIp.trim().toLowerCase()
  if (
    normalizedLookupIp === "0.0.0.0" ||
    normalizedLookupIp === "::" ||
    normalizedLookupIp === "::1" ||
    normalizedLookupIp === "127.0.0.1" ||
    normalizedLookupIp === "localhost"
  ) {
    return fallback
  }

  return {
    ...fallback,
    ip: lookupIp,
  }
}

function shouldSkipGeoEnrichment(ipInput: string | null | undefined): boolean {
  const ip = normalizePublicIp(ipInput).trim().toLowerCase()
  if (!ip) {
    return true
  }

  return ip === "0.0.0.0" || ip === "::" || ip === "::1" || ip === "127.0.0.1" || ip === "localhost"
}

async function resolveGeoLookupUserRoles(userId: string, token?: Record<string, unknown>): Promise<string[]> {
  const roleValues: unknown[] = []

  const collectRoleValues = (...values: unknown[]): void => {
    roleValues.push(...values)
  }

  if (token) {
    collectRoleValues(token.role, token.roles)

    const firebase = token.firebase
    if (firebase && typeof firebase === "object") {
      const firebaseClaims = firebase as Record<string, unknown>
      collectRoleValues(firebaseClaims.role, firebaseClaims.roles)
    }

    const customClaims = token.customClaims
    if (customClaims && typeof customClaims === "object") {
      const claimValues = customClaims as Record<string, unknown>
      collectRoleValues(claimValues.role, claimValues.roles)
    }
  }

  try {
    const authUser = await adminAuth.getUser(userId)
    const claims = (authUser.customClaims || {}) as Record<string, unknown>
    collectRoleValues(claims.role, claims.roles)
  } catch (error) {
    console.warn(`Failed to read auth claims for geo lookup roles for ${userId}:`, error)
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get()
    if (userDoc.exists) {
      const userData = userDoc.data() as Record<string, unknown>
      collectRoleValues(userData.role, userData.roles)
    }
  } catch (error) {
    console.warn(`Failed to read user document roles for geo lookup for ${userId}:`, error)
  }

  try {
    const memberships = await db.collection("memberships").where("userId", "==", userId).limit(100).get()
    for (const membershipDoc of memberships.docs) {
      const membership = membershipDoc.data() as { role?: unknown }
      collectRoleValues(membership.role)
    }
  } catch (error) {
    console.warn(`Failed to read membership roles for geo lookup for ${userId}:`, error)
  }

  const resolvedRoles = normalizeGeoLookupRoles(...roleValues)
  return resolvedRoles.length > 0 ? resolvedRoles : ["guest"]
}

async function enrichSessionGeoIntelligence(args: {
  sessionId: string
  userId: string
  ipAddress: string
  authToken?: Record<string, unknown>
  requestId?: string
  forwardedFor?: string
}): Promise<void> {
  const normalizedIp = normalizePublicIp(args.ipAddress)
  const enrichmentTimestamp = Timestamp.now()
  const intelligenceUpdatedAtIso = enrichmentTimestamp.toDate().toISOString()

  const sessionRef = db.collection("loginSessions").doc(args.sessionId)
  const userSessionRef = db.doc(`users/${args.userId}`).collection("sessions").doc(args.sessionId)

  if (shouldSkipGeoEnrichment(normalizedIp)) {
    const skipPatch = {
      intelligenceSourceIp: normalizedIp || null,
      intelligenceUpdatedAt: enrichmentTimestamp,
      intelligenceStatus: "skipped" as SessionGeoEnrichmentStatus,
    }

    await Promise.all([
      sessionRef.set(skipPatch, { merge: true }),
      userSessionRef.set({
        ...skipPatch,
        syncedAt: enrichmentTimestamp,
      }, { merge: true }),
      updateSessionRedisCache(args.sessionId, {
        intelligenceSourceIp: normalizedIp || null,
        intelligenceUpdatedAt: intelligenceUpdatedAtIso,
        intelligenceStatus: "skipped",
      }),
    ])
    return
  }

  const lookupContext: GeoLookupRequestContext = {
    firebaseUid: args.userId,
    userRoles: await resolveGeoLookupUserRoles(args.userId, args.authToken),
    requestId: args.requestId || `session-geo-${args.sessionId}`,
    forwardedFor: args.forwardedFor || normalizedIp,
  }

  const geoData = await lookupGeoByIp(normalizedIp, lookupContext)
  if (!geoData) {
    const noMatchPatch = {
      intelligenceSourceIp: normalizedIp,
      intelligenceUpdatedAt: enrichmentTimestamp,
      intelligenceStatus: "no-match" as SessionGeoEnrichmentStatus,
    }

    await Promise.all([
      sessionRef.set(noMatchPatch, { merge: true }),
      userSessionRef.set({
        ...noMatchPatch,
        syncedAt: enrichmentTimestamp,
      }, { merge: true }),
      updateSessionRedisCache(args.sessionId, {
        intelligenceSourceIp: normalizedIp,
        intelligenceUpdatedAt: intelligenceUpdatedAtIso,
        intelligenceStatus: "no-match",
      }),
    ])
    return
  }

  const intelligencePatch = {
    ipAddress: geoData.ip,
    location: geoData.city || "Unknown",
    region: geoData.region || "Unknown",
    country: geoData.countryLong || "Unknown",
    latitude: geoData.latitude,
    longitude: geoData.longitude,
    timezone: geoData.timeZone || "UTC",
    asn: geoData.asn,
    asName: geoData.as,
    isp: geoData.isp,
    domain: geoData.domain,
    usageType: geoData.usageType,
    proxy: geoData.proxy,
    intelligenceSourceIp: normalizedIp,
    intelligenceUpdatedAt: enrichmentTimestamp,
    intelligenceStatus: "resolved" as SessionGeoEnrichmentStatus,
  }

  await Promise.all([
    sessionRef.set(intelligencePatch, { merge: true }),
    userSessionRef.set({
      ...intelligencePatch,
      syncedAt: enrichmentTimestamp,
    }, { merge: true }),
    updateSessionRedisCache(args.sessionId, {
      ipAddress: geoData.ip,
      location: geoData.city || "Unknown",
      region: geoData.region || "Unknown",
      country: geoData.countryLong || "Unknown",
      latitude: geoData.latitude,
      longitude: geoData.longitude,
      timezone: geoData.timeZone || "UTC",
      asn: geoData.asn,
      asName: geoData.as,
      isp: geoData.isp,
      domain: geoData.domain,
      usageType: geoData.usageType,
      proxy: geoData.proxy,
      intelligenceSourceIp: normalizedIp,
      intelligenceUpdatedAt: intelligenceUpdatedAtIso,
      intelligenceStatus: "resolved",
    }),
  ])
}

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
    region: "us-central1",
    memory: "256MiB",
    secrets: [functionsEnvJson],
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
      const resolvedGeo = await resolveSessionGeo(request, metrics.ip)
      const resolvedLocation = metrics.location && metrics.location !== "Unknown" ? metrics.location : resolvedGeo.location
      const resolvedIp = resolvedGeo.ip || metrics.ip || "0.0.0.0"
      const deviceFingerprint = `${metrics.userAgent || ""}|${resolvedIp}`
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
        ipAddress: resolvedIp,
        userAgent: metrics.userAgent,
        browser: metrics.browser,
        os: metrics.os,
        location: resolvedLocation,
        deviceFingerprint,
        region: resolvedGeo.region,
        country: resolvedGeo.country,
        latitude: resolvedGeo.latitude,
        longitude: resolvedGeo.longitude,
        timezone: resolvedGeo.timezone,
        asn: resolvedGeo.asn,
        asName: resolvedGeo.as,
        isp: resolvedGeo.isp,
        domain: resolvedGeo.domain,
        usageType: resolvedGeo.usageType,
        proxy: resolvedGeo.proxy,
        intelligenceStatus: "pending" as SessionGeoEnrichmentStatus,
        intelligenceSourceIp: resolvedIp,
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
        resolvedMetrics: {
          ip: resolvedIp,
          location: resolvedLocation,
          region: resolvedGeo.region,
          country: resolvedGeo.country,
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          timezone: resolvedGeo.timezone,
        },
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
    secrets: [functionsEnvJson],
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
      const actorAccess = await resolveActorSessionAccess(auth)
      const result = await performSessionRevoke(
        auth.uid,
        loginId,
        reason,
        false,
        actorAccess.canManageSessions,
        actorAccess.role,
        false,
      )

      console.log(`✅ Session ${loginId} revoked for user ${result.targetUserId}`)

      return {
        success: true,
        loginId,
        revokedAt: result.revokedAt.toDate().toISOString(),
      }
    } catch (error) {
      console.error("❌ Error revoking session:", error)
      throw new Error(`Failed to revoke session: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  })

async function performSessionRevoke(
  actorUid: string,
  loginId: string,
  reason: string | undefined,
  requireAdmin: boolean,
  actorCanManageSessions = false,
  actorRole: "admin" | "manager" | "owner" | "superadmin" | "elevated" | "user" = "user",
  allowCrossUserRevoke = true,
) {
  const revokedAt = Timestamp.now()

  const sessionDoc = await db.collection("loginSessions").doc(loginId).get()
  if (!sessionDoc.exists) {
    throw new Error("Session not found")
  }

  const sessionData = sessionDoc.data()
  const targetUserId = String(sessionData?.userId || "").trim()
  if (!targetUserId) {
    throw new Error("Invalid session record: missing userId")
  }

  const isAdmin = actorRole === "admin"
  const isPrivileged = actorCanManageSessions

  if (requireAdmin && !isPrivileged) {
    throw new Error("Unauthorized: Elevated role required")
  }

  const isCrossUserRequest = targetUserId !== actorUid
  if (isCrossUserRequest && !allowCrossUserRevoke) {
    throw new Error("Unauthorized: You can only revoke your own sessions")
  }

  if (!isPrivileged && isCrossUserRequest) {
    throw new Error("Unauthorized: You can only revoke your own sessions")
  }

  const revokeReason = reason || (isPrivileged ? "privileged_initiated_revoke" : "user_initiated_revoke")

  const batch = db.batch()
  const sessionRef = db.collection("loginSessions").doc(loginId)
  batch.update(sessionRef, {
    revokedAt,
    active: false,
    revokedBy: actorUid,
    revokedByRole: actorRole,
    revokeReason,
  })

  const userSessionRef = db.doc(`users/${targetUserId}`).collection("sessions").doc(loginId)
  batch.set(userSessionRef, {
    revokedAt,
    active: false,
    syncedAt: Timestamp.now(),
  }, {merge: true})

  const legacyRef = db.doc(`login_metrics/${targetUserId}/login_history_Info/${loginId}`)
  batch.set(legacyRef, {
    connected: false,
    revokedAt,
    revokedByUid: actorUid,
  }, {merge: true})

  const loginHistoryEventRef = db
    .collection("login_metrics")
    .doc(targetUserId)
    .collection("login_history_events")
    .doc()
  batch.set(loginHistoryEventRef, {
    uid: targetUserId,
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
    revokedByUid: actorUid,
    createdAt: revokedAt,
  })

  await batch.commit()

  const revocationCacheKey = `revoked:${loginId}`
  const revocationTtl = 30 * 24 * 60 * 60
  await redis.setex(revocationCacheKey, revocationTtl, JSON.stringify({
    revokedAt: revokedAt.toDate().toISOString(),
    userId: targetUserId,
  }))

  await redis.del(`session:${loginId}`)

  try {
    await db.collection("audit_logs").add({
      action: isPrivileged ? "privileged_revoke_session" : "user_revoke_session",
      admin_uid: actorUid,
      target_loginId: loginId,
      target_userId: targetUserId,
      reason: revokeReason,
      timestamp: Timestamp.now(),
      isAdmin,
      actorRole,
    })
  } catch (auditErr) {
    console.warn("Failed to write audit log:", auditErr)
  }

  return {
    revokedAt,
    targetUserId,
    isAdmin,
    isPrivileged,
    actorRole,
  }
}

const collectRoleValues = (value: unknown, collector: string[]): void => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized.length > 0) {
      collector.push(normalized)
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRoleValues(item, collector)
    }
  }
}

const isManagerLikeRole = (role: string): boolean => {
  return role.includes("manager") || role.endsWith("_mgr") || role.endsWith("-mgr")
}

const resolveHighestSessionRole = (roles: string[]): "admin" | "superadmin" | "owner" | "manager" | "elevated" | "user" => {
  if (roles.includes("admin") || roles.includes("platform_admin") || roles.includes("platform-admin")) {
    return "admin"
  }

  if (roles.includes("superadmin") || roles.includes("super_admin") || roles.includes("super-admin")) {
    return "superadmin"
  }

  if (roles.includes("owner")) {
    return "owner"
  }

  if (roles.some((role) => isManagerLikeRole(role))) {
    return "manager"
  }

  if (roles.some((role) => role === "lead" || role === "staff" || role === "operator")) {
    return "elevated"
  }

  return "user"
}

const isBootstrapAdminEmail = (email?: string | null): boolean => {
  if (!email) {
    return false
  }

  const normalizedEmail = email.trim().toLowerCase()
  return env.ADMIN_EMAILS.some((adminEmail) => adminEmail === normalizedEmail)
}

const resolveActorSessionAccess = async (
  auth: { uid: string; token?: Record<string, unknown> },
): Promise<{
  canManageSessions: boolean
  role: "admin" | "manager" | "owner" | "superadmin" | "elevated" | "user"
}> => {
  const collectedRoles: string[] = []

  if (auth.token) {
    collectRoleValues(auth.token.role, collectedRoles)
    collectRoleValues(auth.token.roles, collectedRoles)

    const firebase = auth.token.firebase
    if (firebase && typeof firebase === "object") {
      const firebaseClaims = firebase as Record<string, unknown>
      collectRoleValues(firebaseClaims.role, collectedRoles)
      collectRoleValues(firebaseClaims.roles, collectedRoles)
    }

    const customClaims = auth.token.customClaims
    if (customClaims && typeof customClaims === "object") {
      const claimValues = customClaims as Record<string, unknown>
      collectRoleValues(claimValues.role, collectedRoles)
      collectRoleValues(claimValues.roles, collectedRoles)
    }
  }

  const userDoc = await db.collection("users").doc(auth.uid).get()
  if (userDoc.exists) {
    const userData = userDoc.data() as Record<string, unknown>
    collectRoleValues(userData.role, collectedRoles)
    collectRoleValues(userData.roles, collectedRoles)
  }

  try {
    const memberships = await db.collection("memberships").where("userId", "==", auth.uid).limit(100).get()
    for (const membershipDoc of memberships.docs) {
      const membership = membershipDoc.data() as { role?: unknown }
      collectRoleValues(membership.role, collectedRoles)
    }
  } catch (error) {
    console.warn(`Failed to read memberships while resolving session access for ${auth.uid}:`, error)
  }

  try {
    const authUser = await adminAuth.getUser(auth.uid)
    const claims = (authUser.customClaims || {}) as Record<string, unknown>
    collectRoleValues(claims.role, collectedRoles)
    collectRoleValues(claims.roles, collectedRoles)

    if (isBootstrapAdminEmail(authUser.email)) {
      collectedRoles.push("admin")
    }
  } catch {
    // no-op, role resolution continues with available sources
  }

  const resolvedRole = resolveHighestSessionRole(collectedRoles)
  return {
    canManageSessions: resolvedRole !== "user",
    role: resolvedRole,
  }
}

export const revokeUserLoginSessionByAdmin = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    secrets: [functionsEnvJson],
    region: "us-central1",
  },
  async (request) => {
    const { loginId, reason } = request.data as { loginId: string; reason?: string }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized: You must be authenticated")
    }

    if (!loginId) {
      throw new Error("Missing required field: loginId")
    }

    try {
      const actorAccess = await resolveActorSessionAccess(auth)
      const result = await performSessionRevoke(
        auth.uid,
        loginId,
        reason,
        true,
        actorAccess.canManageSessions,
        actorAccess.role,
      )

      console.log(`✅ Admin ${auth.uid} revoked session ${loginId} for user ${result.targetUserId}`)

      return {
        success: true,
        loginId,
        targetUserId: result.targetUserId,
        revokedAt: result.revokedAt.toDate().toISOString(),
      }
    } catch (error) {
      console.error("❌ Error in admin session revoke:", error)
      throw new Error(`Failed to revoke user session: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

export const revokeAllUserSessionsByAdmin = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    secrets: [functionsEnvJson],
    region: "us-central1",
  },
  async (request) => {
    const {
      targetUserId,
      reason,
      limit = 100,
    } = request.data as {
      targetUserId: string
      reason?: string
      limit?: number
    }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized: You must be authenticated")
    }

    const normalizedTargetUserId = String(targetUserId || "").trim()
    if (!normalizedTargetUserId) {
      throw new Error("Missing required field: targetUserId")
    }

    const actorAccess = await resolveActorSessionAccess(auth)
    if (!actorAccess.canManageSessions) {
      throw new Error("Unauthorized: Elevated role required")
    }

    const queryLimit = Math.max(1, Math.min(200, Number(limit) || 100))

    try {
      const snapshot = await db
        .collection("loginSessions")
        .where("userId", "==", normalizedTargetUserId)
        .where("active", "==", true)
        .limit(queryLimit)
        .get()

      const revokedSessionIds: string[] = []

      for (const sessionDoc of snapshot.docs) {
        const sessionId = sessionDoc.id
        await performSessionRevoke(
          auth.uid,
          sessionId,
          reason || "admin_bulk_revoke",
          true,
          actorAccess.canManageSessions,
          actorAccess.role,
        )
        revokedSessionIds.push(sessionId)
      }

      return {
        success: true,
        targetUserId: normalizedTargetUserId,
        revokedCount: revokedSessionIds.length,
        sessionIds: revokedSessionIds,
      }
    } catch (error) {
      console.error("❌ Error in admin bulk session revoke:", error)
      throw new Error(`Failed to revoke user sessions: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

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

export const getUserLoginSessionsByAdmin = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    secrets: [functionsEnvJson],
    region: "us-central1",
  },
  async (request) => {
    const {
      targetUserId,
      limit = 50,
      activeOnly = false,
    } = request.data as {
      targetUserId: string
      limit?: number
      activeOnly?: boolean
    }
    const auth = request.auth

    if (!auth) {
      throw new Error("Unauthorized")
    }

    const actorAccess = await resolveActorSessionAccess(auth)
    if (!actorAccess.canManageSessions) {
      throw new Error("Unauthorized: Elevated role required")
    }

    const normalizedTargetUserId = String(targetUserId || "").trim()
    if (!normalizedTargetUserId) {
      throw new Error("Missing required field: targetUserId")
    }

    try {
      const queryLimit = Math.max(1, Math.min(200, Number(limit) || 50))
      let q = db
        .collection("loginSessions")
        .where("userId", "==", normalizedTargetUserId)

      if (activeOnly) {
        q = q.where("active", "==", true)
      }

      const snapshot = await q
        .orderBy("lastActivityAt", "desc")
        .limit(queryLimit)
        .get()

      const sessions = snapshot.docs.map((doc) => ({
        loginId: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || doc.data().createdAt,
        lastActivityAt: doc.data().lastActivityAt?.toDate?.()?.toISOString?.() || doc.data().lastActivityAt,
        revokedAt: doc.data().revokedAt?.toDate?.()?.toISOString?.() || doc.data().revokedAt,
        expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString?.() || doc.data().expiresAt,
      }))

      return {
        success: true,
        targetUserId: normalizedTargetUserId,
        sessions,
        total: sessions.length,
      }
    } catch (error) {
      console.error("❌ Error getting target user sessions:", error)
      throw new Error(`Failed to get target user sessions: ${error instanceof Error ? error.message : "Unknown error"}`)
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
            const cachedIntelligenceStatus = String(sessionData.intelligenceStatus || "").trim().toLowerCase()
            const shouldRefreshFromFirestore = cachedIntelligenceStatus === "pending"

            if (shouldRefreshFromFirestore) {
              // Pending intelligence in cache can become stale if geo enrichment completed after session creation.
              // Fall through to Firestore to refresh cache with authoritative values.
            } else {
            // Update activity and TTL in cache
              await redis.setex(`session:${sessionId}`, 30 * 60, cachedSession)
              return { valid: true, cachedHit: true }
            }
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

      // Update lastActivityAt + presence (real-time active-user tracking)
      const now = Timestamp.now()
      const batch = db.batch()
      const sessionRef = db.collection("loginSessions").doc(sessionId)
      batch.update(sessionRef, { lastActivityAt: now })

      const userSessionRef = db.doc(`users/${userId}`).collection("sessions").doc(sessionId)
      batch.update(userSessionRef, { lastActivityAt: now, syncedAt: now })

      // Upsert presence doc — used by computeActiveUsersNow to count live users
      const presenceRef = db.collection("presence").doc(userId)
      batch.set(presenceRef, {
        userId,
        sessionId,
        lastSeen: now,
        isUser: true,
      }, { merge: true })

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
 * Guest presence heartbeat — called every 60 s by unauthenticated clients.
 * Updates `guests/{guestId}.lastSeen` so computeActiveUsersNow can count them.
 * No auth required (guest users are anonymous).
 */
export const recordGuestPresence = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
  },
  async (request) => {
    const { guestId } = request.data as { guestId: string }

    if (!guestId || typeof guestId !== "string" || guestId.length > 128) {
      throw new Error("Missing or invalid guestId")
    }

    try {
      const guestRef = db.collection("guests").doc(guestId)
      const guestDoc = await guestRef.get()

      // Only update existing guests — never create via this endpoint
      if (!guestDoc.exists) {
        return { updated: false, reason: "not_found" }
      }

      await guestRef.update({ lastSeen: Timestamp.now() })

      return { updated: true }
    } catch (error) {
      console.error("❌ Error recording guest presence:", error)
      throw new Error("Failed to record presence")
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

export const enrichLoginSessionGeo = onDocumentWritten(
  {
    document: "loginSessions/{sessionId}",
    database: DATABASE_NAME,
    region: "us-central1",
    memory: "512MiB",
    secrets: [functionsEnvJson],
  },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()

    if (!after) {
      return
    }

    const sessionId = String(event.params.sessionId || "").trim()
    const userId = String(after.userId || "").trim()
    const ipAddress = normalizePublicIp(String(after.ipAddress || ""))
    const currentSourceIp = normalizePublicIp(String(after.intelligenceSourceIp || ""))
    const currentStatus = String(after.intelligenceStatus || "").trim().toLowerCase()

    if (!sessionId || !userId || !ipAddress) {
      return
    }

    const ipChanged = normalizePublicIp(String(before?.ipAddress || "")) !== ipAddress
    const alreadyResolvedForSameIp =
      currentSourceIp === ipAddress &&
      typeof after.intelligenceUpdatedAt !== "undefined" &&
      (currentStatus === "resolved" || currentStatus === "skipped")

    if (!ipChanged && alreadyResolvedForSameIp) {
      return
    }

    try {
      await enrichSessionGeoIntelligence({
        sessionId,
        userId,
        ipAddress,
        requestId: `enrich-login-session-geo-${sessionId}`,
        forwardedFor: ipAddress,
      })
      console.log(`✅ Session intelligence enriched for ${sessionId}`)
    } catch (error) {
      console.error(`❌ Error enriching session intelligence for ${sessionId}:`, error)
    }
  },
)

function getContinentFromTimezone(timezone: string): string {
  if (!timezone) return "Unknown"
  if (timezone.startsWith("Europe/")) return "Europe"
  if (timezone.startsWith("Asia/")) return "Asia"
  if (timezone.startsWith("America/")) return "North America"
  if (timezone.startsWith("Africa/")) return "Africa"
  if (timezone.startsWith("Australia/") || timezone.startsWith("Pacific/")) return "Oceania"
  if (timezone.startsWith("Antarctica/")) return "Antarctica"
  return "Unknown"
}

export const enrichGuestGeo = onDocumentWritten(
  {
    document: "guests/{guestId}",
    database: DATABASE_NAME,
    region: "us-central1",
    memory: "256MiB",
    secrets: [functionsEnvJson],
  },
  async (event) => {
    const before = event.data?.before.data() as { ip?: { raw?: string }; intelligenceStatus?: string; intelligenceSourceIp?: string; intelligenceUpdatedAt?: unknown } | undefined
    const after = event.data?.after.data() as { ip?: { raw?: string }; intelligenceStatus?: string; intelligenceSourceIp?: string; intelligenceUpdatedAt?: unknown } | undefined

    if (!after) {
      return
    }

    const guestId = String(event.params.guestId || "").trim()
    const ipAddress = normalizePublicIp(String(after.ip?.raw || ""))
    const currentSourceIp = normalizePublicIp(String(after.intelligenceSourceIp || ""))
    const currentStatus = String(after.intelligenceStatus || "").trim().toLowerCase()

    if (!guestId || !ipAddress) {
      return
    }

    const ipChanged = normalizePublicIp(String(before?.ip?.raw || "")) !== ipAddress
    const alreadyResolvedForSameIp =
      currentSourceIp === ipAddress &&
      typeof after.intelligenceUpdatedAt !== "undefined" &&
      (currentStatus === "resolved" || currentStatus === "skipped")

    if (!ipChanged && alreadyResolvedForSameIp) {
      return
    }

    const guestRef = db.collection("guests").doc(guestId)
    const enrichmentTimestamp = Timestamp.now()

    if (shouldSkipGeoEnrichment(ipAddress)) {
      await guestRef.set({
        intelligenceSourceIp: ipAddress,
        intelligenceUpdatedAt: enrichmentTimestamp,
        intelligenceStatus: "skipped" as GuestGeoEnrichmentStatus,
      }, { merge: true })
      return
    }

    try {
      const geoData = await lookupGeoByIp(ipAddress, {
        firebaseUid: `guest:${guestId}`,
        userRoles: ["guest"],
        requestId: `enrich-guest-geo-${guestId}`,
        forwardedFor: ipAddress,
      })
      if (!geoData) {
        await guestRef.set({
          intelligenceSourceIp: ipAddress,
          intelligenceUpdatedAt: enrichmentTimestamp,
          intelligenceStatus: "no-match" as GuestGeoEnrichmentStatus,
        }, { merge: true })
        return
      }

      const timezone = geoData.timeZone || "UTC"
      await guestRef.set({
        country: geoData.countryLong || "Unknown",
        region: geoData.region || "Unknown",
        location: geoData.city || "Unknown",
        latitude: geoData.latitude ?? 0,
        longitude: geoData.longitude ?? 0,
        timezone,
        geo: {
          continent: getContinentFromTimezone(timezone),
          region: geoData.countryShort || "Unknown",
        },
        network: geoData.network,
        proxy: geoData.proxy,
        intelligenceSourceIp: ipAddress,
        intelligenceUpdatedAt: enrichmentTimestamp,
        intelligenceStatus: "resolved" as GuestGeoEnrichmentStatus,
      }, { merge: true })

      console.log(`✅ Guest intelligence enriched for ${guestId}`)
    } catch (error) {
      console.error(`❌ Error enriching guest intelligence for ${guestId}:`, error)
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
    secrets: [functionsEnvJson],
    region: "us-central1",
  },
  async (request) => {
    const { userId, method, sessionId } = request.data as { userId: string; method: "email" | "sms" | "auto"; sessionId?: string }
    const auth = request.auth

    if (!auth || auth.uid !== userId) {
      throw new Error("Unauthorized: Can only request code for own account")
    }

    if (!userId || !method) {
      throw new Error("Missing required fields: userId, method")
    }

    if (!["email", "sms", "auto"].includes(method)) {
      throw new Error("Invalid method: must be 'email', 'sms' or 'auto'")
    }

    // Rate limit: max 3 verification code requests per 10 minutes per user
    const rateLimitKey = `rate_verification:${userId}`
    const currentCount = await redis.get(rateLimitKey)
    if (currentCount && Number(currentCount) >= 3) {
      throw new Error(
        "Too many verification code requests. Please wait before requesting a new code."
      )
    }

    // Increment or set the counter with 10-minute expiry
    const newCount = currentCount ? Number(currentCount) + 1 : 1
    await redis.setex(rateLimitKey, 600, newCount.toString())

    try {
      const userRecord = await adminAuth.getUser(userId)
      const userSnap = await db.doc(`users/${userId}`).get()
      const userData = userSnap.data() as Record<string, unknown> | undefined
      const enrolledFactors = userRecord.multiFactor?.enrolledFactors || []
      const phoneMfaFactor = enrolledFactors.find((factor) => factor.factorId === "phone")
      const hasMfaEnabled = enrolledFactors.length > 0
      const hasPhoneNumber = typeof userRecord.phoneNumber === "string" && userRecord.phoneNumber.length > 0
      const hasPhoneMfa = !!phoneMfaFactor
      const availableMethods = resolveAvailableMfaMethods(userRecord)
      const preferences = readMfaPreferences(userData, availableMethods)

      const selectedMethod = method === "auto" ?
        preferences.primaryMethod :
        (method === "sms" ? "sms" : "email")

      const effectiveMethod = isMethodAvailable(availableMethods, selectedMethod) ?
        selectedMethod :
        getDefaultPrimaryMethod(availableMethods)

      if (effectiveMethod === "email" && !userRecord.email) {
        throw new Error("No email found on account. Add an email first.")
      }

      if (effectiveMethod === "sms" && !hasPhoneNumber && !hasPhoneMfa) {
        throw new Error("No phone number or phone MFA factor found. Add phone number or enable MFA first.")
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      const expiresAtTs = Timestamp.fromDate(expiresAt)

      // Store verification attempt in Firestore
      const verificationRef = db.collection("device_verifications").doc()
      const verificationData: Record<string, unknown> = {
        userId,
        code: verificationCode,
        method: effectiveMethod,
        expiresAt: expiresAtTs,
        createdAt: Timestamp.now(),
        verified: false,
        attempts: 0,
      }
      if (sessionId) {
        verificationData.sessionId = sessionId
      }
      await verificationRef.set(verificationData)

      // Store in Redis for fast lookup (expires in 10 minutes)
      const verificationCacheKey = `verification:${userId}:${effectiveMethod}`
      const redisData: Record<string, string> = {
        code: verificationCode,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      }
      if (sessionId) {
        redisData.sessionId = sessionId
      }
      await redis.setex(verificationCacheKey, 600, JSON.stringify(redisData))

      let deliveryStatus: "sent" | "pending_client_mfa"
      let deliveryMessage = ""

      if (effectiveMethod === "email") {
        await sendSecurityNoticeEmail({
          to: userRecord.email as string,
          subject: "Your device verification code",
          text: `Your verification code is ${verificationCode}. It expires in 10 minutes.`,
          html: buildVerificationEmailHtml(verificationCode),
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
        method: effectiveMethod,
        deliveryStatus,
        hasPhoneNumber,
        hasMfaEnabled,
        sessionId: sessionId || null,
      }
    } catch (error) {
      console.error("❌ Error sending verification code:", error)
      throw new Error(
        `Failed to send verification code: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  },
)

export const getMfaSecurityPreferences = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
    secrets: [functionsEnvJson],
  },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new Error("Unauthorized")
    }

    const userId = auth.uid
    const [userRecord, userSnap] = await Promise.all([
      adminAuth.getUser(userId),
      db.doc(`users/${userId}`).get(),
    ])

    const availableMethods = resolveAvailableMfaMethods(userRecord)
    const userData = userSnap.data() as Record<string, unknown> | undefined
    const preferences = readMfaPreferences(userData, availableMethods)

    return {
      success: true,
      preferences,
      availableMethods,
      hasEnrolledMfa: (userRecord.multiFactor?.enrolledFactors || []).length > 0,
    }
  },
)

export const updateMfaSecurityPreferences = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
    secrets: [functionsEnvJson],
  },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new Error("Unauthorized")
    }

    const userId = auth.uid
    const { primaryMethod, secondaryMethod, riskEmailNotifications } =
      (request.data || {}) as {
        primaryMethod?: MfaPreferredMethod
        secondaryMethod?: MfaPreferredMethod | null
        riskEmailNotifications?: boolean
      }

    const [userRecord, userSnap] = await Promise.all([
      adminAuth.getUser(userId),
      db.doc(`users/${userId}`).get(),
    ])

    const availableMethods = resolveAvailableMfaMethods(userRecord)
    const userData = userSnap.data() as Record<string, unknown> | undefined
    const existingPreferences = readMfaPreferences(userData, availableMethods)

    const desiredPrimary = normalizePreferredMethod(primaryMethod, existingPreferences.primaryMethod)
    const normalizedPrimary = isMethodAvailable(availableMethods, desiredPrimary) ?
      desiredPrimary : getDefaultPrimaryMethod(availableMethods)

    const desiredSecondary = secondaryMethod ? normalizePreferredMethod(secondaryMethod, normalizedPrimary) : null
    const normalizedSecondary = desiredSecondary && desiredSecondary !== normalizedPrimary &&
      isMethodAvailable(availableMethods, desiredSecondary) ? desiredSecondary :
      getDefaultSecondaryMethod(availableMethods, normalizedPrimary)

    const preferences: MfaSecurityPreferences = {
      primaryMethod: normalizedPrimary,
      secondaryMethod: normalizedSecondary,
      riskEmailNotifications: typeof riskEmailNotifications === "boolean" ?
        riskEmailNotifications : existingPreferences.riskEmailNotifications,
      updatedAt: new Date().toISOString(),
    }

    await db.doc(`users/${userId}`).set({
      settings: {
        security: {
          mfa: preferences,
        },
      },
      updated_At: new Date(),
    }, { merge: true })

    await writeSecurityAuditAndTimeline({
      userId,
      action: "mfa_preferences_updated",
      eventType: "mfa_preference_updated",
      message: "MFA challenge preference was updated",
      metadata: {
        previous: existingPreferences,
        updated: preferences,
        availableMethods,
      },
    })

    return {
      success: true,
      preferences,
      availableMethods,
    }
  },
)

export const notifyMfaRiskEvent = onCall(
  {
    cors: true,
    enforceAppCheck: false,
    region: "us-central1",
    secrets: [functionsEnvJson],
  },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new Error("Unauthorized")
    }

    const eventType = String((request.data as { eventType?: string })?.eventType || "").trim().toLowerCase()
    if (eventType !== "mfa_disabled") {
      throw new Error("Unsupported event type")
    }

    const userId = auth.uid
    const [userRecord, userSnap] = await Promise.all([
      adminAuth.getUser(userId),
      db.doc(`users/${userId}`).get(),
    ])

    const availableMethods = resolveAvailableMfaMethods(userRecord)
    const userData = userSnap.data() as Record<string, unknown> | undefined
    const preferences = readMfaPreferences(userData, availableMethods)

    const hasEnrolledMfa = (userRecord.multiFactor?.enrolledFactors || []).length > 0
    const evaluation = evaluateMfaDisabledNotification({
      hasEnrolledMfa,
      riskEmailNotifications: preferences.riskEmailNotifications,
      hasEmail: Boolean(userRecord.email),
    })

    if (evaluation.shouldNotify) {
      await sendSecurityNoticeEmail({
        to: userRecord.email as string,
        subject: "Security alert: Multi-factor authentication is disabled",
        text: "Multi-factor authentication was disabled on your account. Your account is now at higher risk. Re-enable an authenticator app (recommended) or SMS/Text message in Security settings as soon as possible.",
        html: buildMfaDisabledEmailHtml(),
      })
    }

    if (!hasEnrolledMfa) {
      await db.collection("users").doc(userId).collection("alerts").add({
        type: "warning",
        title: "MFA disabled",
        message: "Your account currently has no enrolled second factor. Re-enable MFA to reduce account takeover risk.",
        createdAt: Timestamp.now(),
        read: false,
        metadata: {
          source: "notifyMfaRiskEvent",
          eventType,
          notificationReason: evaluation.reason,
        },
      })
    }

    await writeSecurityAuditAndTimeline({
      userId,
      action: "mfa_disabled_risk_event",
      eventType: "mfa_disabled",
      message: "MFA disabled risk event processed",
      metadata: {
        eventType,
        hasEnrolledMfa,
        riskEmailNotifications: preferences.riskEmailNotifications,
        notificationReason: evaluation.reason,
        notificationSent: evaluation.shouldNotify,
      },
    })

    if (!evaluation.shouldNotify) {
      return { success: true, skipped: true, reason: evaluation.reason }
    }

    return { success: true }
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
    const { userId, code, deviceId, deviceName, sessionId, mfaVerified } = request.data as {
                        userId: string
                        code: string
                        deviceId: string
                        deviceName: string
                        sessionId?: string
                        mfaVerified?: boolean
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

      // If the verification was bound to a session, validate the session matches
      if (verificationData.sessionId && sessionId && verificationData.sessionId !== sessionId) {
        throw new Error("Verification code was generated for a different session. Please request a new code.")
      }

      // If MFA was verified on the client (SMS path), skip code check
      const isMfaVerified = mfaVerified === true && verificationData.method === "sms"

      if (!isMfaVerified) {
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
