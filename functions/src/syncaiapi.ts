/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-len */
import { NextFunction, Request, Response, Router } from "express"
import {
    anthropicAICore, openaiAICore, groqAICore, crawl4aiCore, jinaAICrawl,
    helloWorld, arachnefly,
} from "./handlers"
import { auth } from "./app/config"

class ReverseAPIProxy {
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
        const authHeader = req.headers["api-key"] as string

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthorized: Missing or invalid token" })
            return
        }

        const token = authHeader.split(" ")[1]

        try {
            const decodedToken = await auth.verifyIdToken(token)
            if (decodedToken) {
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
        /* Jina AI */
        this.router.get("/jina", helloWorld)
        this.router.get("/jina/:url", this.isJwtAuth,
            jinaAICrawl)

        /* Machines by Arachnefly */

        // Check if the image is deployable
        this.router.get("/machines/check-image", this.isJwtAuth,
            arachnefly.checkImageDeployability)
    }

    /**
           * https Router Post
           */

    private httpRoutesPosts(): void {
        this.router.post("/anthropic/messages", anthropicAICore) // Search for Markets
        this.router.post("/openai/chat/completions", openaiAICore)
        this.router.post("/groq/chat/completions", groqAICore)

        /* Crawl4AI */
        this.router.post("/crawl", crawl4aiCore)


        /* Machines by Arachnefly */
        // Deploy a new Machine
        // this.router.post('/machines/deploy', arachnefly.deployMachine)

        // this.router.post('/api/machines/logs', receiveLogs)
    }
    /**
           * https Router Put
           */

    private httpRoutesPut(): void {

    }

    /**
           * https Router Delete
           */

    private httpRoutesDelete(): void {

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

export { ReverseAPIProxy }
