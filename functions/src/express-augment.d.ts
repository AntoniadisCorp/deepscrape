import type {DecodedIdToken} from "firebase-admin/auth"

declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken
    rateLimit?: {
      resetTime?: number | Date
    }
  }
}

export {}
