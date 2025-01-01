import { UserInfo } from "@angular/fire/auth";

export type Users = {
    // Firebase UID
    uid: string;
    username?: string;
    providerParent: string
    providerId: string;
    providerData: UserInfo[]
    mfa_nabled?: boolean;
    emailVerified: boolean;
    last_login_at: Date;
    created_At: Date;
    updated_At?: Date;

    // Stripe customer ID
    stripeId?: string

    // Stripe Subscription data
    subscriptionId?: string;
    status?: string;
    currentUsage?: number;
    itemId?: string
}
