/* eslint-disable object-curly-spacing */
import { UserInfo } from "firebase-functions/lib/common/providers/identity"

export type Users = {
    // Firebase UID
    uid: string
    email: string | null
    username: string
    details?: UserDetails
    notifications?: any
    alerts?: any
    settings?: any
    providerParent: string
    providerId: string
    providerData: UserInfo[]
    mfa_nabled?: boolean
    emailVerified: boolean
    last_login_at: Date // Timestamp | null
    created_At: Date
    updated_At?:Date

    // Phone authentication fields
    phoneNumber?: string
    // Optional, may not be present in all user objects
    phoneVerified?: boolean | null

    // Stripe customer ID
    stripeId?: string
    // Stripe Subscription data
    subscriptionId?: string
    status?: string
    currentUsage?: number
    balance?: number
    itemId?: string

    // User Authorization fields
    role?: string
    plan?: "free" | "pro" | "enterprise"
    isAdmin?: boolean

    // Profile status
    profileStatus?: ProfileStatus
    loginMetricsId?: string
}

export type UserDetails = {
    displayName: string
    photoURL?: string
    engineerStatus?: string
    geo?: {
        continent: string,
        region: string
     } // continent: "EU" region: "GR"
    region?: string
    country?: string
    language?: string
    timezone?: string
    bio?: string
    website?: string
    location?: string
    longitude?: number
    latitude?: number
    company?: string
    jobTitle?: string
    socialLinks?: UserSocialLinks
    last_username_change?: Date | null
    updated_At?: Date | null
}


export type ProfileStatus = {
    isBanned?: boolean
    isDeleted?: boolean
    banReason?: string
    deleteReason?: string
    banExpires?: Date | null
    deletedAt?: Date | null
}


export type loginMetrics = {
    id?: string
    lastGuestId: string
    /** Time the user was created. */
    creationTime?: string
    /** Time the user last signed in. */
    lastSignInTime?: string
    lastLoginId?: string
    loginCount?: number
}

export type loginHistoryInfo = {
    id?: string
    providerId: string
    uid?: string
    timestamp: Date
    connection: string
    connected: boolean
    os: string
    ipAddress: string
    browser: string
    userAgent: string
    location?: string // Optional field to store the location of the login
    deviceType?: string // Optional field to store the type of device used
    guestId?: string // Optional field to store geolocation data
    signOutTime?: Date // Optional field to store sign out time
}

export type Guest = {
  id: string
  uid: string
  ip: { ipv4: string | null, ipv6: string | null, raw: string | null }
  userAgent: string
  browser: string
  os: string
  device: string
  language: string
  timezone: string
  country: string
  region: string
  geo: {
    continent: string
    region: string
  }
  latitude: number
  longitude: number
  location: string
  createdAt: Date
  lastSeen: Date
  linkedAt?: Date | null
}


export type UserSocialLinks = {
    twitter?: string
    linkedin?: string
    threads?: string
    youtube?: string
    codepen?: string
    github?: string
    engineerStatus?: string
    website?: string
    stackoverflow?: string
}
