import { User, UserInfo } from "@angular/fire/auth"
import { Timestamp } from "firebase/firestore"
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
    last_login_at: any // Timestamp | null
    created_At: Date
    updated_At?:Date

    // Phone authentication fields
    phoneNumber?: string
    phoneVerified?: boolean | null // Optional, may not be present in all user objects

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
    plan?: 'free' | 'pro' | 'enterprise'
    isAdmin?: boolean

    // Profile status
    profileStatus?: ProfileStatus
    loginMetrics?: loginMetrics
}

export type UserDetails = {
    displayName: string
    photoURL?: string
    engineerStatus?: string
    geo?: {continent: string,region: string } // continent: "EU" region: "GR"
    country?: string
    language?: string
    timezone?: string
    bio?: string
    website?: string
    location?: string
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
    id: string
    /** Time the user was created. */
    creationTime?: string
    /** Time the user last signed in. */
    lastSignInTime?: string
    lastLoginId?: string
    loginCount?: number
    recentLogins?: loginHistoryInfo[]
}

export type loginHistoryInfo = {
    id: string
    timestamp: Date
    connected: boolean
    ipAddress: string
    userAgent: string
    location?: string // Optional field to store the location of the login
    deviceType?: string // Optional field to store the type of device used
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



// export type FireUser = {
//     uid: string
//     email: string | null
//     displayName: string | null
//     photoURL: string | null
//     phoneNumber?: string | null
//     providerId: string
//     providerData: UserInfo[]
//     emailVerified: boolean
//     phoneVerified?: boolean // Optional, may not be present in all user objects
// }
