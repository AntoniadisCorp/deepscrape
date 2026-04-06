# Enterprise Sessions - Implementation Remediation Plan

## Overview
This document provides step-by-step implementation guidance to fix the 14 identified gaps in the enterprise session architecture. Focus on **P0 (Production Blockers)** first.

---

## Phase 1: Production Safety (P0 - 4 hours)

### Task 1.1: Update setSignOutMetrics to Sync Both Collections
**File**: `src/app/core/services/firestore.service.ts`  
**Lines**: 402-430  
**Current Issue**: Only updates legacy `login_history_Info`

**Required Changes**:
```typescript
// BEFORE (lines 402-430):
async setSignOutMetrics(userId: string, loginId: string) {
  const loginHistoryRef = this.getLoginHistoryRef(userId, loginId)
  await this.setDoc(loginHistoryRef, {
    connected: false,
    signOutTime: new Date()
  })
}

// AFTER (what it should do):
async setSignOutMetrics(userId: string, loginId: string) {
  const batch = this.db.batch()
  
  // 1. Update legacy collection for backwards compatibility
  const loginHistoryRef = this.getLoginHistoryRef(userId, loginId)
  batch.update(loginHistoryRef, {
    connected: false,
    signOutTime: new Date()
  })
  
  // 2. NEW: Update new loginSessions collection
  const sessionRef = this.db.collection('loginSessions').doc(loginId)
  batch.update(sessionRef, {
    active: false,
    signOutTime: Timestamp.now()
  })
  
  await batch.commit()
}
```

**Validation**: After logout, verify both collections have matching `active: false` and `signOutTime`

---

### Task 1.2: Create signOutLoginSession Cloud Function
**File**: `functions/src/gfunctions/sessions.ts`  
**Required Addition**: New function after `revokeMyLoginSession`

```typescript
/**
 * Called when user explicitly logs out (different from forced revocation)
 * Marks session as signed_out in loginSessions only
 * setSignOutMetrics in frontend Firestore service updates login_history_Info
 */
export const signOutLoginSession = onCall(
  { secrets: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const { loginId } = request.data
    if (!loginId) {
      throw new HttpsError('invalid-argument', 'loginId required')
    }

    const userId = request.auth.uid
    const db = getFirestore()
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })

    try {
      // 1. Verify ownership
      const sessionRef = db.collection('loginSessions').doc(loginId)
      const sessionDoc = await sessionRef.get()
      
      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', `Session ${loginId} not found`)
      }
      
      if (sessionDoc.data().userId !== userId) {
        throw new HttpsError('permission-denied', 'Can only sign out own sessions')
      }

      // 2. Update session in Firestore
      await sessionRef.update({
        active: false,
        signedOutAt: FieldValue.serverTimestamp(),
        signOutReason: 'user_initiated_logout'
      })

      // 3. Invalidate Redis cache immediately
      await redis.del(`session:${loginId}`)
      await redis.setex(`signed-out:${loginId}`, 86400, '1') // 24h marker
      
      return {
        success: true,
        message: `Session ${loginId} signed out`
      }
    } finally {
      redis.close()
    }
  }
)
```

**Validation**: After calling this function, session should be marked `active: false` in Firestore and removed from Redis

---

### Task 1.3: Invalidate Redis Cache on Logout
**File**: `src/app/core/services/auth.service.ts`  
**Lines**: 990-1070 (logout method)  
**Current Issue**: Calls `guestTrackingService.clear()` but doesn't invalidate Redis

**Required Change** (pseudo-code):
```typescript
async logout(): Promise<void> {
  // 1. Mark signout in Firestore for both collections
  const loginId = this.guestTrackingService.loginId()
  await this.firestoreService.setSignOutMetrics(this.userData()!.id, loginId)
  
  // 2. NEW: Call Cloud Function to invalidate Redis
  try {
    await this.callSignOutLoginSession(loginId)
  } catch (err) {
    // Log error but continue logout (don't block)
    console.error('Failed to invalidate session in Redis:', err)
  }
  
  // 3. Clear local state
  this.token = undefined
  this.isAdmin = false
  this.userSubject.next(null)
  this.guestTrackingService.clear()
  
  // 4. Clear cookies and storage
  const cookieService = inject(CookieService)
  cookieService.deleteAll('/')
  this.clearStorage()
  
  // 5. Sign out from Firebase
  await this.authService.signOut()
}

// Helper method
private async callSignOutLoginSession(loginId: string): Promise<void> {
  const functions = getFunctions()
  const signOutSession = httpsCallable(functions, 'signOutLoginSession')
  return signOutSession({ loginId })
}
```

**Validation**: After logout, Redis key `session:{loginId}` should not exist, and `signed-out:{loginId}` should exist

---

### Task 1.4: Add HttpOnly Cookie Middleware
**File**: `server.ts` (Express SSR entry point)  
**Location**: After `app.use(express.json())` middleware  
**Required Addition**:

```typescript
// Add to imports at top
import cookieParser from 'cookie-parser'
import { PLATFORM_ID } from '@angular/core'

// Add after express.json() middleware (around line 50)
app.use(cookieParser())

// Add middleware to handle session cookies
app.use((req, res, next) => {
  // Store original res.json to intercept responses
  const originalJson = res.json.bind(res)
  
  res.json = function(data: any) {
    // If this was a successful login/heartbeat, set session cookie
    const sessionId = data?.sessionId || data?.session?.id
    if (sessionId && req.path.includes('login') || req.path.includes('heartbeat')) {
      res.cookie('sid', sessionId, {
        httpOnly: true,
        secure: req.protocol === 'https', // true in production
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
      })
    }
    return originalJson(data)
  }
  next()
})

// Middleware to clear session cookie on logout
app.post('/logout', (req, res, next) => {
  res.clearCookie('sid', {
    httpOnly: true,
    path: '/'
  })
  next()
})
```

**Validation**: 
- Login creates HttpOnly `sid` cookie ✓
- Cookie has secure flags set ✓
- Cookie has 30-day max age ✓
- Logout clears cookie ✓

---

## Phase 2: Security Hardening (P1 - 4.5 hours)

### Task 2.1: Add RBAC + Audit Logging to revokeMyLoginSession
**File**: `functions/src/gfunctions/sessions.ts`  
**Lines**: revokeMyLoginSession function  
**Required Enhancement**:

```typescript
export const revokeMyLoginSession = onCall(
  { secrets: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const { loginId, reason } = request.data
    const userId = request.auth.uid
    
    try {
      // 1. Verify session ownership
      const sessionDoc = await db.collection('loginSessions').doc(loginId).get()
      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', 'Session not found')
      }
      
      const sessionData = sessionDoc.data()
      if (sessionData.userId !== userId) {
        // CRITICAL: Prevent cross-user revocation
        throw new HttpsError('permission-denied', 'Can only revoke own sessions')
      }
      
      // 2. Check if requester is admin (for audit trail)
      const idTokenResult = await request.auth.getIdTokenResult()
      const isAdmin = idTokenResult.claims.role === 'admin'
      
      // 3. Mark as revoked in Firestore
      await db.collection('loginSessions').doc(loginId).update({
        revokedAt: FieldValue.serverTimestamp(),
        revokedBy: userId,
        revokedByRole: isAdmin ? 'admin' : 'user',
        revokeReason: reason || 'user_initiated_revoke'
      })
      
      // 4. Invalidate Redis cache
      await redis.del(`session:${loginId}`)
      await redis.setex(`revoked:${loginId}`, 86400, '1') // 24h marker
      
      // 5. NEW: Add audit log
      if (isAdmin) {
        // Only log admin revocations explicitly
        await db.collection('audit_logs').add({
          action: 'admin_revoke_session',
          admin_uid: userId,
          target_loginId: loginId,
          target_userId: sessionData.userId,
          reason: reason || 'admin_action',
          timestamp: FieldValue.serverTimestamp()
        })
      }
      
      return { success: true, revokedAt: Timestamp.now() }
    } catch (err) {
      if (err instanceof HttpsError) throw err
      throw new HttpsError('internal', `Revocation failed: ${err}`)
    }
  }
)
```

**Validation**: 
- User can only revoke own sessions ✓
- Admin revocations logged to audit_logs ✓
- Redis cache invalidated ✓

---

### Task 2.2: Integrate SessionDisplayInfo Type into SecurityComponent
**File**: `src/app/core/types/global.interface.ts`  
**Current State**: Types exist but not used in UI

**Required Changes**:
```typescript
// Add to global.interface.ts
export interface SessionDisplayInfo extends LoginSession {
  isCurrent: boolean
  isRevoked: boolean
  isSignedOut: boolean
  deviceFingerprintMatch: boolean
  humanReadableTime: string
}
```

Then in `src/app/pages/user/settings/security/security.component.ts`:
```typescript
// BEFORE (line 87):
readonly activeSessions = signal<loginHistoryInfo[]>([])

// AFTER:
readonly activeSessions = signal<SessionDisplayInfo[]>([])

// In loadActiveSessions():
const sessions = await this.firestoreService.getMyLoginSessionsWithFallback(50).toPromise()
const displaySessions: SessionDisplayInfo[] = sessions?.map(s => ({
  ...s,
  isCurrent: s.loginId === this.currentSessionId(),
  isRevoked: !!s.revokedAt,
  isSignedOut: !!s.signOutTime,
  deviceFingerprintMatch: s.deviceFingerprint === this.currentDeviceFp,
  humanReadableTime: this.formatSessionTime(s.createdAt)
})) || []
this.activeSessions.set(displaySessions)
```

**Validation**: Session list displays with correct badges (Current, Revoked, Signed Out)

---

### Task 2.3: Implement Merge+Deduplicate in getMyLoginSessionsWithFallback
**File**: `src/app/core/services/firestore.service.ts`  
**Lines**: 443-460  
**Current Issue**: Fallback only, doesn't merge data

**Required Implementation**:
```typescript
getMyLoginSessionsWithFallback(limit: number): Observable<LoginSession[]> {
  const userId = this.userData?.id
  if (!userId) return of([])
  
  return this.getMyLoginSessions(limit).pipe(
    switchMap(newSessions => {
      // If new sessions found, merge with legacy for backwards compat
      return this.getLoginHistoryNew(userId, undefined, undefined, limit).pipe(
        map(legacySessions => {
          // Merge using loginId as key
          const merged = new Map<string, LoginSession>()
          
          // Add new sessions (primary source)
          newSessions.forEach(s => {
            merged.set(s.loginId, s)
          })
          
          // Add legacy sessions not in new set
          legacySessions.forEach(legacy => {
            if (!merged.has(legacy.loginId)) {
              const newSession: LoginSession = {
                loginId: legacy.loginId,
                userId: legacy.userId,
                deviceId: legacy.deviceId || '',
                createdAt: legacy.createdAtTs,
                active: legacy.connected,
                browser: legacy.displayBrowser,
                os: legacy.displayOs,
                ipAddress: legacy.ipAddress || '',
                // ... other mappings
              }
              merged.set(legacy.loginId, newSession)
            }
          })
          
          return Array.from(merged.values())
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit)
        })
      )
    }),
    catchError(() => {
      // If both fail, return empty
      return of([])
    })
  )
}
```

**Validation**: Queries return merged data without duplicates

---

### Task 2.4: Load Current Session ID on Component Init
**File**: `src/app/pages/user/settings/security/security.component.ts`  
**Lines**: 122-140 (ngOnInit)  
**Current Issue**: currentSessionId never populated

**Required Change**:
```typescript
ngOnInit() {
  // Extract current session ID from multiple sources
  const loginIdFromStorage = this.localStorage.getItem('loginId')
  const loginIdFromSignal = this.guestTrackingService.loginId()
  
  const currentSessionId = loginIdFromSignal || loginIdFromStorage || ''
  this.currentSessionId.set(currentSessionId)
  
  // Then load sessions
  this.loadActiveSessions()
}

// In isCurrentSession() helper:
isCurrentSession(sessionId: string): boolean {
  const current = this.currentSessionId()
  return !!current && current === sessionId
}
```

**Validation**: 
- currentSessionId signal populated ✓
- isCurrentSession() returns true for current ✓
- UI shows "This is your current session" badge ✓

---

## Phase 3: Enhanced Security (P2 - 5 hours)

### Task 3.1: Add Device Fingerprint Verification on Heartbeat
**File**: `functions/src/handlers/home_handler.ts` → `heartbeat()` function  
**Required Addition**:

```typescript
// In validateSessionCookie() or heartbeat():
const currentDeviceFp = computeDeviceFingerprint(req)
const storedDeviceFp = sessionData?.deviceFingerprint

if (currentDeviceFp !== storedDeviceFp) {
  // Device mismatch - log suspicious activity
  await logSuspiciousActivity({
    userId: sessionData.userId,
    loginId: sessionData.loginId,
    type: 'device_mismatch',
    currentFp: currentDeviceFp,
    storedFp: storedDeviceFp,
    ipAddress: req.ip
  })
  
  // Optionally require re-auth (set flag in response)
  // return { valid: false, requiresReauth: true }
}
```

**Validation**: Suspicious device logins logged and flagged

---

### Task 3.2: Create recordLogoutMetrics Cloud Function
**File**: `functions/src/gfunctions/sessions.ts`  
**Required New Function**:

```typescript
export const recordLogoutMetrics = onCall(
  { secrets: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const userId = request.auth.uid
    const { loginId } = request.data
    
    const batch = db.batch()
    
    // 1. Update loginSessions
    const sessionRef = db.collection('loginSessions').doc(loginId)
    batch.update(sessionRef, {
      active: false,
      signOutTime: FieldValue.serverTimestamp()
    })
    
    // 2. Update login_metrics for analytics
    const metricsRef = db.doc(`login_metrics/${userId}/login_history_Info/${loginId}`)
    batch.update(metricsRef, {
      connected: false,
      signOutTime: new Date()
    })
    
    // 3. Commit atomically
    await batch.commit()
    
    // 4. Invalidate Redis
    await redis.del(`session:${loginId}`)
    
    return { success: true }
  }
)
```

**Validation**: Logout atomically updates both collections and clears Redis

---

### Task 3.3: Add Missing Firestore Indexes
**File**: `firestore.indexes.json`  
**Required Additions**:

```json
{
  "indexes": [
    {
      "collectionGroup": "loginSessions",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "loginSessions",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "revokedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Deploy**: `firebase deploy --only firestore:indexes`

---

## Phase 4: User Experience (P3+ - 9 hours)

### Task 4.1: Session Timeout Warning Dialog
**See**: `docs/SESSION_TIMEOUT_WARNING.md` (separate doc)

### Task 4.2: Device Verification Modal
**See**: `docs/DEVICE_VERIFICATION_MODAL.md` (separate doc)

### Task 4.3: Session Activity Visualization
**See**: `docs/SESSION_ACTIVITY_CHART.md` (separate doc)

---

## Implementation Order & Timeline

**Day 1 (4 hours - P0 Production Safety)**:
1. Task 1.1: Update setSignOutMetrics (30 min)
2. Task 1.2: Create signOutLoginSession CF (1 hour)
3. Task 1.3: Invalidate Redis on logout (30 min)
4. Task 1.4: Add HttpOnly cookie middleware (1.5 hours)

**Day 2 (4.5 hours - P1 Security Hardening)**:
1. Task 2.1: Add RBAC + audit logging (1 hour)
2. Task 2.2: Integrate SessionDisplayInfo type (1 hour)
3. Task 2.3: Implement merge+deduplicate (1.5 hours)
4. Task 2.4: Load current session ID (1 hour)

**Day 3 (5 hours - P2 Enhanced Security)**:
1. Task 3.1: Device fingerprint verification (2 hours)
2. Task 3.2: recordLogoutMetrics CF (1.5 hours)
3. Task 3.3: Firestore indexes (30 min)
4. Testing & validation (1 hour)

**Days 4+ (P3 UX Polish)**:
- Session timeout warning
- Device verification modal
- Activity visualization

---

## Testing Checklist

### P0 Testing (After Day 1)
- [ ] Login → Session created in Firestore + Redis
- [ ] Logout → Both collections updated, Redis cleared, cookie deleted
- [ ] HttpOnly cookie set with secure flags
- [ ] Cloud Function returns proper errors

### P1 Testing (After Day 2)
- [ ] RBAC prevents cross-user revocation
- [ ] Audit logs created for admin actions
- [ ] SessionDisplayInfo displays correctly
- [ ] Current session badge shows
- [ ] Merge deduplicates correctly

### P2 Testing (After Day 3)
- [ ] Device fingerprint mismatch logged
- [ ] recordLogoutMetrics updates both collections atomic
- [ ] Indexes deployed and queries faster
- [ ] Test multi-device scenarios

### P3+ Testing
- [ ] Timeout warning appears before expiry
- [ ] Device verification modal blocks login
- [ ] Activity chart renders correctly

---

## Rollback Plan

If critical issue encountered:
1. Revert Cloud Functions to previous version
2. Disable HttpOnly cookie middleware (set conditional flag)
3. Remove Redis invalidation calls (keep Firestore writes)
4. Keep Firestore dual writes (backwards compat)

---

## Success Metrics

- Sign-out completely invalidates session (Redis + Firestore) ✓
- Current session identified on security tab ✓
- RBAC prevents unauthorized revocation ✓
- Session display type integrated ✓
- Audit trail for admin actions ✓

