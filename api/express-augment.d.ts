import type { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier'

declare module 'express-serve-static-core' {
    interface Request {
        user?: DecodedIdToken
        rateLimit?: {
            resetTime?: number | Date
        }
    }
}

export {}