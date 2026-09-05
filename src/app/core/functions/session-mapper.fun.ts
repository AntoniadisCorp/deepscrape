import { SessionDisplayInfo } from '../types'
import { toNetworkIntel, toProxyIntel } from './session-intel.fun'

type SessionRecord = Record<string, unknown>

type SessionMapperOptions = {
  defaultUserId?: string
  currentSessionId?: string
}

export function mapSessionRecordToDisplaySession(
  rawInput: unknown,
  options: SessionMapperOptions = {},
): SessionDisplayInfo {
  const raw = (rawInput as SessionRecord) || {}
  const sessionId = resolveSessionIdFromRecord(raw)
  const createdAt = resolveDateFromKeys(raw, [
    'createdAt',
    'timestamp',
    'lastSignInTime',
    'signInTime',
    'created_At',
    'updated_At',
  ])
  const lastActivityAt = resolveDateFromKeys(raw, [
    'lastActivityAt',
    'updated_At',
    'timestamp',
    'lastSignInTime',
  ])
  const expiresAt = resolveDateFromKeys(raw, ['expiresAt'])
  const revokedAt = normalizeDateLike(raw['revokedAt'])

  const createdValue = createdAt || new Date()

  return {
    sessionId,
    userId: String(raw['userId'] || options.defaultUserId || ''),
    deviceId: String(raw['deviceId'] || ''),
    createdAt: createdValue,
    lastActivityAt: lastActivityAt || createdValue,
    expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt,
    active: raw['active'] !== false && !revokedAt,
    ipAddress: String(raw['ipAddress'] || ''),
    userAgent: String(raw['userAgent'] || ''),
    browser: String(raw['browser'] || ''),
    os: String(raw['os'] || ''),
    location: resolveSessionLocation(raw),
    providerId: String(raw['providerId'] || 'firebase'),
    intelligenceStatus: resolveIntelligenceStatus(raw),
    network: toNetworkIntel(raw),
    proxy: toProxyIntel(raw),
    isCurrent: !!sessionId && sessionId === String(options.currentSessionId || ''),
    isRevoked: !!revokedAt,
    isSignedOut: !!raw['signOutTime'],
    deviceFingerprintMatch: false,
    humanReadableTime: createdAt ? createdAt.toLocaleString() : 'Unknown time',
  }
}

function resolveIntelligenceStatus(raw: SessionRecord): string | undefined {
  const normalized = String(raw['intelligenceStatus'] || '').trim().toLowerCase()
  return normalized || undefined
}

export function resolveSessionIdFromRecord(rawInput: unknown): string {
  const raw = (rawInput as SessionRecord) || {}
  return String(raw['sessionId'] || raw['loginId'] || raw['id'] || '')
}

function resolveSessionLocation(raw: SessionRecord): string {
  const direct = String(raw['location'] || '').trim()
  if (direct && direct.toLowerCase() !== 'unknown') {
    return direct
  }

  const guestInfo = (raw['guestInfo'] as Record<string, unknown> | undefined) || {}
  const guestLocation = String(guestInfo['location'] || '').trim()
  if (guestLocation && guestLocation.toLowerCase() !== 'unknown') {
    return guestLocation
  }

  const country = String(raw['country'] || '').trim()
  const region = String(raw['region'] || '').trim()
  return [region, country].filter(Boolean).join(', ')
}

function resolveDateFromKeys(raw: SessionRecord, keys: string[]): Date | null {
  for (const key of keys) {
    const parsed = normalizeDateLike(raw[key])
    if (parsed) {
      return parsed
    }
  }
  return null
}

function normalizeDateLike(input: unknown): Date | null {
  if (!input) return null
  if (input instanceof Date) return input

  const asRecord = input as { toDate?: () => Date; seconds?: number }
  if (typeof asRecord?.toDate === 'function') return asRecord.toDate()
  if (typeof asRecord?.seconds === 'number') return new Date(asRecord.seconds * 1000)

  if (typeof input === 'string' || typeof input === 'number') {
    const date = new Date(input)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}
