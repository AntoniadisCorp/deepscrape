export type GlobalTabs = {
    svg: string
    icon: string
    color: string
    name: string
    id: string
}


export type Loading = {
    google: boolean
    github: boolean
    email: boolean,
    remove: boolean,
    password: boolean,
    logout: boolean
    phone: boolean
    code: boolean,
    mfa: boolean,
}

export type DropDownOption = {

    name: string
    code: string
}

export type ScrollDimensions = {

    deltaX: number
    deltaY: number
}


export type AIModel = DropDownOption
export type Unit = DropDownOption


export type PlanPeriod = {
    value: string
    label: string
}

export type CrawlLinkTab = 'crawlpack' | 'machines' | 'browserconfig' | 'crawlerconfig' | 'crawlresults' | 'crawlextraction'
export type LinkTabs = {
    label: string
    link: string
    active: boolean
    icon: string
    index: CrawlLinkTab
}


export interface DockerImageInfo {
    registry: string;
    namespace: string;
    repository: string;
    tag?: string;
    digest?: string;
    fullName: string;
}

/**
 * Enterprise login session - tracks authenticated user sessions per device
 * @since 2026-04-06 Enterprise SaaS architecture
 */
export interface LoginSession {
    sessionId: string;
    userId: string;
    deviceId: string;
    createdAt: Date | string;
    lastActivityAt: Date | string;
    expiresAt: Date | string;
    revokedAt: Date | string | null;
    active: boolean;
    ipAddress: string;
    userAgent: string;
    browser: string;
    os: string;
    location: string;
    providerId: string;
}

/**
 * Device session info for security dashboard
 */
export interface DeviceSessionInfo {
    loginId: string;
    deviceId: string;
    browser: string;
    os: string;
    location: string;
    ipAddress: string;
    createdAt: string;
    lastActivityAt: string;
    active: boolean;
    isCurrent: boolean;
}

/**
 * PHASE 2.2: Session display info - extends LoginSession with UI-specific fields
 * Used in security dashboard to show session status and current device badge
 */
export interface SessionDisplayInfo extends LoginSession {
    isCurrent: boolean;
    isRevoked: boolean;
    isSignedOut: boolean;
    deviceFingerprintMatch: boolean;
    humanReadableTime: string;
}

/**
 * PHASE 4.3: A single activity data point stored in the loginSessions/{id}/activity subcollection.
 */
export interface SessionActivityPoint {
    timestamp: Date;
    activeSeconds: number;
    activityCount: number;
}
