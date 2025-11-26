/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-len */
import { NextFunction, Request, Response, Router } from "express"
import { auth } from "../app/config"
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier"
import { analyticsEventHandler, batchAnalyticsEventHandler, guestFingerprintHandler } from "../gfunctions"
import { heartbeat } from "../handlers"

declare module "express-serve-static-core" {
    interface Request {
        user?: DecodedIdToken
    }
}

class EventsAPIProxy {
    public router: Router

    constructor() {
        this.router = Router()
        this.httpRoutesGets()
        this.httpRoutesPosts()
        this.httpRoutesPut()
        this.httpRoutesDelete()
    }

    // ------------------- Node JS Security -------------------
    // Middleware to verify Firebase JWT
    async isJwtAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
        const authHeader = req.headers["authorization"] as string

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthorized: Missing or invalid token" })
            return
        }

        const token = authHeader.split(" ")[1]

        try {
            const decodedToken = await auth.verifyIdToken(token)
            if (decodedToken) {
                req.user = decodedToken
                req.app.locals["user"] = token // Add user info to the request
                next()
            } else {
                throw new Error("Invalid token")
            }
        } catch (error) {
            console.error("JWT Verification Error:", error)
            res.status(401).json({ error: "Unauthorized: Invalid token" })
        }
    }

    // ------------------- Node JS Routes -------------------

    /**
     * https Router Gets
     */

    private httpRoutesGets(): void {

    }

    /**
     * https Router Post
     */

    private httpRoutesPosts(): void {
        // this.router.post('/api/machines/logs', receiveLogs)

        /* Heartbeats and Analytics */
        // Guest fingerprint endpoint
        this.router.post("/guest-fingerprint", guestFingerprintHandler)


        // Analytics event endpoint
        this.router.post("/analytics/event", analyticsEventHandler)

        // Analytics batch event endpoint
        this.router.post("/analytics/batch", batchAnalyticsEventHandler)

        // Heartbeat endpoint for guests and users
        this.router.post("/heartbeat", heartbeat)
    }
    /**
           * https Router Put
           */

    private httpRoutesPut(): void {


        /**
         * Crawler Management by crawlagent
        */

        // Cancel a Crawl Task
        // this.router.put("/crawl/job/:tempTaskId/cancel", crawlagent.cancelTask)
    }

    /**
     * https Router Delete
     */

    private httpRoutesDelete(): void {
        /**
         * Machines by Arachnefly
         */

    }
}

// ---- Helpers (enumeration-safe) ----
// async function getOrCreateUserByEmail(email: string, profile = {}) {
//   try {
//     const user = await auth.getUserByEmail(email)
//     return user; // Do not reveal to client
//   } catch (e: any) {
//     if (e.code === "auth/user-not-found") {
//       // Create without revealing existence
//       return await auth.createUser({
//         email,
//         emailVerified: !!profile.emailVerified,
//         displayName: profile.displayName || undefined,
//         photoURL: profile.picture || undefined,
//       })
//     }
//     throw e
//   }
// }

export { EventsAPIProxy }
