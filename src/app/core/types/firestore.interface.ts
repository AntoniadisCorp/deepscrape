import { UserInfo } from "@angular/fire/auth"

export type Users = {
    // Firebase UID
    uid: string
    username?: string
    providerParent: string
    providerId: string
    providerData: UserInfo[]
    mfa_nabled?: boolean
    emailVerified: boolean
    last_login_at: Date
    created_At: Date
    updated_At?: Date

    // Phone authentication fields
    phoneNumber?: string
    phoneVerified?: boolean | null // Optional, may not be present in all user objects

    // Stripe customer ID
    stripeId?: string

    // Stripe Subscription data
    subscriptionId?: string
    status?: string
    currentUsage?: number
    itemId?: string
}

export type FireUser = {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    phoneNumber?: string | null
    providerId: string
    providerData: UserInfo[]
    emailVerified: boolean
    phoneVerified?: boolean // Optional, may not be present in all user objects
}
