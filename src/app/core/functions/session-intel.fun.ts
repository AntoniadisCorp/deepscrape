import { IpNetworkIntel, IpProxyIntel, SessionDisplayInfo } from '../types'

type SessionIntelShape = Pick<SessionDisplayInfo, 'network' | 'proxy' | 'intelligenceStatus'>
type SessionRiskLevel = 'pending' | 'low' | 'medium' | 'high'

const fallbackNetworkIntel: IpNetworkIntel = {
  asn: null,
  as: null,
  isp: null,
  domain: null,
  usageType: null,
}

const fallbackProxyIntel: IpProxyIntel = {
  isProxy: false,
  proxyType: null,
  threat: null,
  lastSeenDays: null,
  provider: null,
  fraudScore: null,
  confidence: 'unknown',
}

export function toNetworkIntel(raw: any): IpNetworkIntel {
  return {
    asn: cleanNullableString(raw?.network?.asn ?? raw?.asn),
    as: cleanNullableString(raw?.network?.as ?? raw?.network?.asName ?? raw?.as ?? raw?.asName),
    isp: cleanNullableString(raw?.network?.isp ?? raw?.isp),
    domain: cleanNullableString(raw?.network?.domain ?? raw?.domain),
    usageType: cleanNullableString(raw?.network?.usageType ?? raw?.usageType),
  }
}

export function toProxyIntel(raw: any): IpProxyIntel {
  const candidate = raw?.proxy || {}
  return {
    isProxy: candidate?.isProxy === true,
    proxyType: cleanNullableString(candidate?.proxyType),
    threat: cleanNullableString(candidate?.threat),
    lastSeenDays: typeof candidate?.lastSeenDays === 'number' ? candidate.lastSeenDays : null,
    provider: cleanNullableString(candidate?.provider),
    fraudScore: typeof candidate?.fraudScore === 'number' ? candidate.fraudScore : null,
    confidence: cleanNullableString(candidate?.confidence) || 'unknown',
  }
}

export function getSessionRiskLevel(session: SessionIntelShape): SessionRiskLevel {
  if (isIntelligencePending(session)) {
    return 'pending'
  }

  const proxy = session.proxy || fallbackProxyIntel
  const threat = (proxy.threat || '').toLowerCase()
  const usageType = (session.network?.usageType || '').toLowerCase()

  if (proxy.isProxy || threat.includes('fraud') || threat.includes('spam') || threat.includes('abuse')) {
    return 'high'
  }

  if (proxy.confidence === 'unknown' || usageType.includes('data center') || usageType.includes('hosting')) {
    return 'medium'
  }

  return 'low'
}

export function getSessionRiskTone(session: SessionIntelShape): string {
  const risk = getSessionRiskLevel(session)
  if (risk === 'pending') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
  }

  if (risk === 'high') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }

  if (risk === 'medium') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  }

  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
}

export function getSessionRiskLabel(session: SessionIntelShape): string {
  const risk = getSessionRiskLevel(session)
  if (risk === 'pending') return 'Pending enrichment'
  if (risk === 'high') return 'High risk'
  if (risk === 'medium') return 'Needs review'
  return 'Low risk'
}

export function getSessionRiskReason(session: SessionIntelShape): string {
  if (isIntelligencePending(session)) {
    return 'IP intelligence enrichment is still running. This usually resolves in a few seconds.'
  }

  const proxy = session.proxy || fallbackProxyIntel
  const usageType = session.network?.usageType

  if (proxy.isProxy) {
    const proxyType = proxy.proxyType ? ` (${proxy.proxyType})` : ''
    const threat = proxy.threat ? ` - threat: ${proxy.threat}` : ''
    return `Open proxy traffic detected${proxyType}${threat}`
  }

  if (proxy.confidence === 'unknown') {
    return 'Proxy intelligence is incomplete for this IP; verify behavior before trusting this device'
  }

  if (usageType && (usageType.toLowerCase().includes('data center') || usageType.toLowerCase().includes('hosting'))) {
    return `Session came from ${usageType}; this is often automation infrastructure`
  }

  return 'No proxy abuse indicators detected from current IP intelligence'
}

export function getSessionNetworkSummary(session: SessionIntelShape): string {
  const network = session.network || fallbackNetworkIntel
  const primary = [network.asn, network.as].filter(Boolean).join(' • ')
  const secondary = [network.usageType, network.isp, network.domain].filter(Boolean).join(' • ')
  const value = [primary, secondary].filter(Boolean).join(' • ')
  return value || 'Network intelligence unavailable'
}

export function getSessionProxySummary(session: SessionIntelShape): string {
  const proxy = session.proxy || fallbackProxyIntel
  if (!proxy.isProxy) {
    if (proxy.confidence === 'unknown') {
      return 'Proxy status unknown'
    }
    return 'No open proxy detected'
  }

  const details = [proxy.proxyType, proxy.provider, proxy.threat].filter(Boolean).join(' • ')
  return details ? `Proxy detected: ${details}` : 'Proxy detected'
}

function cleanNullableString(value: unknown): string | null {
  const normalized = String(value || '').trim()
  if (!normalized || normalized.toLowerCase() === 'unknown') {
    return null
  }
  return normalized
}

function isIntelligencePending(session: SessionIntelShape): boolean {
  return String(session.intelligenceStatus || '').trim().toLowerCase() === 'pending'
}
