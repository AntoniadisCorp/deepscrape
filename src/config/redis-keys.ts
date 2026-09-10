/**
 * Redis namespace, TTL and cap constants shared by the Express API (`api/`) and
 * the Cloud Functions package (`functions/`).
 *
 * Why this file exists: every Redis key was previously built from an inline
 * template literal at its call site, so no single place answered "what lives in
 * Redis, and how long does it survive?". Two keys (`guestfp:*` and
 * `analytics:events`) ended up with no expiry at all and grew without bound.
 * Every new key MUST be declared here so TTL coverage stays auditable.
 *
 * This module is intentionally dependency-free so it can be imported from the
 * Angular/API tsconfig graph and the Cloud Functions tsconfig graph alike.
 *
 * TTL policy:
 * - `null` means "no expiry" and is only allowed for keys that are explicitly
 *   bounded by another mechanism (a hard cap, a trim, or a periodic delete).
 *   No key should rely on "it will probably be overwritten".
 */

/** Coarse prefix shared by every key, so ops can SCAN a namespace in one pass. */
export const REDIS_NAMESPACE = 'deepscrape'

// ---------------------------------------------------------------------------
// Sessions and revocation
// ---------------------------------------------------------------------------

export const SESSION_PREFIX = 'session:'
export const REVOKED_PREFIX = 'revoked:'
export const SIGNED_OUT_PREFIX = 'signed-out:'
export const AUTH_SESSION_REVOKED_PREFIX = 'auth:session:revoked:'

/** TTL for the cached session document. Refreshed on every validated read. */
export const SESSION_CACHE_TTL_SECONDS = 30 * 60

/** TTL for a revocation tombstone. Outliving the session TTL prevents resurrection. */
export const REVOCATION_TTL_SECONDS = 30 * 24 * 60 * 60

/** TTL for the sign-out tombstone consumed by the session-status read path. */
export const SIGNED_OUT_TTL_SECONDS = 24 * 60 * 60

/** TTL for the legacy `login_history_Info`-derived revocation tombstone. */
export const LEGACY_REVOCATION_TTL_SECONDS = 30 * 24 * 60 * 60

// ---------------------------------------------------------------------------
// Presence (sorted sets, scored by epoch ms)
// ---------------------------------------------------------------------------

export const ONLINE_USERS_KEY = 'online:users'
export const ONLINE_GUESTS_KEY = 'online:guests'
export const PRESENCE_USER_PREFIX = 'user:'
export const PRESENCE_GUEST_PREFIX = 'guest:'

/** Liveness window for a presence key. Must exceed the client heartbeat interval. */
export const PRESENCE_TTL_SECONDS = 60 * 60

/** Trailing window used to trim stale members from the presence sorted sets. */
export const PRESENCE_WINDOW_MS = 5 * 60 * 1000

export const PRESENCE_WINDOWS_MS = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000] as const

// ---------------------------------------------------------------------------
// Guests and geo intelligence
// ---------------------------------------------------------------------------

export const GUEST_FINGERPRINT_PREFIX = 'guestfp:'

/**
 * TTL for the fingerprint -> guestId mapping. Bounded rather than permanent:
 * without it every new IP/UA pair minted a key that never expired.
 * Chosen to match the one-year guest cookie's practical lifetime (a guest who
 * has not returned in 30 days is not worth a permanent mapping).
 */
export const GUEST_FINGERPRINT_TTL_SECONDS = 30 * 24 * 60 * 60

/** Minimum interval between Firestore `lastSeen` writes for a guest. */
export const GUEST_LAST_SEEN_WRITE_INTERVAL_MS = 5 * 60 * 1000

export const GEO_CACHE_PREFIX = 'ipintel:v2:'

/** TTL for a successfully resolved IP intelligence payload. */
export const GEO_CACHE_TTL_SECONDS = 60 * 60 * 6

/**
 * TTL for a cached *failure*. Shorter than the success TTL on purpose: a
 * provider outage should be retried sooner than a legitimate negative result.
 */
export const GEO_CACHE_FAILURE_TTL_SECONDS = 60 * 5

// ---------------------------------------------------------------------------
// Client analytics ingress
// ---------------------------------------------------------------------------

export const ANALYTICS_EVENTS_KEY = 'analytics:events'

/** Events popped per drain run (one drain runs from the scheduled function). */
export const CLIENT_EVENT_MAX = 200

/** Hard ceiling on the ingress list. Enforced at write time and on drain. */
export const CLIENT_EVENT_LIST_MAX = 5000

/** Maximum metadata properties retained per client event. */
export const CLIENT_EVENT_PROP_MAX = 20

// ---------------------------------------------------------------------------
// Verification codes, trusted devices, abuse budgets
// ---------------------------------------------------------------------------

export const VERIFICATION_PREFIX = 'verification:'
export const TRUSTED_DEVICE_PREFIX = 'trusted:'
export const VERIFICATION_RATE_LIMIT_PREFIX = 'rate_verification:'
export const DEVICE_MISMATCH_PREFIX = 'security:device-mismatch:'
export const SESSION_ACCESS_PREFIX = 'session-access:'

/**
 * TTL for a cached role-resolution result. Role resolution costs up to three
 * Firestore reads and runs on every privileged call, so it is cached briefly —
 * but a demotion must bite quickly, hence 60s rather than minutes.
 */
export const SESSION_ACCESS_CACHE_TTL_SECONDS = 60

/** TTL for a verification code, matching the Firestore `expiresAt` it shadows. */
export const VERIFICATION_TTL_SECONDS = 10 * 60

export const TRUSTED_DEVICE_TTL_SECONDS = 90 * 24 * 60 * 60

/** Verification-code request budget per user. */
export const VERIFICATION_RATE_LIMIT_MAX = 3
export const VERIFICATION_RATE_LIMIT_WINDOW_SECONDS = 10 * 60

/** Dedupe window for device-mismatch audit rows. */
export const DEVICE_MISMATCH_DEDUPE_TTL_SECONDS = 10 * 60

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export const RATE_LIMIT_PREFIX = 'rateLimit:'
export const API_RATE_LIMIT_PREFIX = 'apiRateLimit:'
export const AUTH_RATE_LIMIT_PREFIX = 'authRateLimit'
export const EVENT_RATE_LIMIT_PREFIX = 'eventRateLimit'
export const FUNCTIONS_RATE_LIMIT_PREFIX = 'functionsRateLimit'

// ---------------------------------------------------------------------------
// Key builders — the only sanctioned way to construct a key
// ---------------------------------------------------------------------------

export const sessionKey = (sessionId: string): string => `${SESSION_PREFIX}${sessionId}`
export const revokedKey = (loginId: string): string => `${REVOKED_PREFIX}${loginId}`
export const signedOutKey = (loginId: string): string => `${SIGNED_OUT_PREFIX}${loginId}`
export const legacyRevokedKey = (userId: string, loginId: string): string =>
  `${AUTH_SESSION_REVOKED_PREFIX}${userId}:${loginId}`

export const presenceUserKey = (userId: string): string => `${PRESENCE_USER_PREFIX}${userId}`
export const presenceGuestKey = (guestId: string): string => `${PRESENCE_GUEST_PREFIX}${guestId}`

export const guestFingerprintKey = (fingerprint: string): string =>
  `${GUEST_FINGERPRINT_PREFIX}${fingerprint}`

export const geoCacheKey = (ipDigest: string): string => `${GEO_CACHE_PREFIX}${ipDigest}`

export const verificationKey = (userId: string, method: string): string =>
  `${VERIFICATION_PREFIX}${userId}:${method}`

export const trustedDeviceKey = (userId: string, deviceId: string): string =>
  `${TRUSTED_DEVICE_PREFIX}${userId}:${deviceId}`

export const verificationRateLimitKey = (userId: string): string =>
  `${VERIFICATION_RATE_LIMIT_PREFIX}${userId}`

export const sessionAccessKey = (uid: string): string =>
  `${SESSION_ACCESS_PREFIX}${uid}`

export const deviceMismatchKey = (loginId: string, fingerprint: string): string =>
  `${DEVICE_MISMATCH_PREFIX}${loginId}:${fingerprint}`

export const functionsRateLimitKey = (tier: string): string =>
  `${FUNCTIONS_RATE_LIMIT_PREFIX}:${tier}`
