/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-len */
import { NextFunction, Request, Response, Router } from "express"
import {
    anthropicAICore, openaiAICore, groqAICore, crawl4aiCore, jinaAICrawl,
    arachnefly,
} from "../handlers"
import { auth, db } from "../app/config"
import { BillingSnapshot, getBillingAccessMode, resolveBillingPricingPolicy } from "../domain"
import { consumeBillingCredits, releaseBillingCredits, reserveBillingCredits } from "../app/billing-credits"

type BillingChargeContext = {
    uid: string
    amount: number
    bucket: "purchased" | "included"
    action: string
    idempotencyBase: string
}

const randomSuffix = (): string => Math.random().toString(36).slice(2, 10)

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

    async requirePaidAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
        const uid = req.user?.uid
        if (!uid) {
            res.status(401).json({ error: "unauthorized", code: "unauthorized" })
            return
        }

        try {
            const billingRef = db.doc(`users/${uid}/billing/current`)
            const billingSnap = await billingRef.get()

            const now = Date.now()
            if (billingSnap.exists) {
                const billing = billingSnap.data() as BillingSnapshot
                const accessMode = getBillingAccessMode(billing, now)

                if (accessMode !== "free") {
                    const policy = resolveBillingPricingPolicy(req.method, req.path)
                    const shouldCharge = policy.credits > 0 && (accessMode === "credits" || accessMode === "plan")

                    let chargeContext: BillingChargeContext | null = null

                    if (shouldCharge) {
                        const bucket: "purchased" | "included" = accessMode === "credits" ? "purchased" : "included"
                        const idempotencyBase = `${uid}:${req.method}:${req.path}:${now}:${randomSuffix()}`

                        await reserveBillingCredits({
                            uid,
                            amount: policy.credits,
                            bucket,
                            ledger: {
                                source: "syncaiapi",
                                reason: `reserve:${policy.action}`,
                                metadata: {
                                    action: policy.action,
                                    method: req.method,
                                    path: req.path,
                                },
                                idempotencyKey: `${idempotencyBase}:reserve`,
                            },
                        })

                        chargeContext = {
                            uid,
                            amount: policy.credits,
                            bucket,
                            action: policy.action,
                            idempotencyBase,
                        }

                        res.setHeader("x-billing-credits-reserved", String(policy.credits))
                        res.setHeader("x-billing-action", policy.action)
                    }

                    let settled = false
                    const settleCharge = async (shouldConsume: boolean): Promise<void> => {
                        if (settled || !chargeContext) {
                            return
                        }

                        settled = true

                        try {
                            if (shouldConsume) {
                                await consumeBillingCredits({
                                    uid: chargeContext.uid,
                                    amount: chargeContext.amount,
                                    bucket: chargeContext.bucket,
                                    releaseReserved: true,
                                    ledger: {
                                        source: "syncaiapi",
                                        reason: `consume:${chargeContext.action}`,
                                        metadata: {
                                            action: chargeContext.action,
                                            method: req.method,
                                            path: req.path,
                                            statusCode: res.statusCode,
                                        },
                                        idempotencyKey: `${chargeContext.idempotencyBase}:consume`,
                                    },
                                })
                                return
                            }

                            await releaseBillingCredits({
                                uid: chargeContext.uid,
                                amount: chargeContext.amount,
                                bucket: chargeContext.bucket,
                                ledger: {
                                    source: "syncaiapi",
                                    reason: `release:${chargeContext.action}`,
                                    metadata: {
                                        action: chargeContext.action,
                                        method: req.method,
                                        path: req.path,
                                        statusCode: res.statusCode,
                                    },
                                    idempotencyKey: `${chargeContext.idempotencyBase}:release`,
                                },
                            })
                        } catch (settlementError) {
                            console.error("Billing credit settlement failed:", settlementError)
                        }
                    }

                    res.once("finish", () => {
                        const success = res.statusCode >= 200 && res.statusCode < 400
                        void settleCharge(success)
                    })

                    res.once("close", () => {
                        if (!res.writableEnded) {
                            void settleCharge(false)
                        }
                    })

                    next()
                    return
                }
            }

            res.status(402).json({
                error: "payment_required",
                code: "payment_required",
                message: "Payment required to access this endpoint",
            })
        } catch (error) {
            console.error("Payment gate check failed:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    // ------------------- Node JS Routes -------------------

    /**
     * https Router Gets
     */

    private httpRoutesGets(): void {
        /* Jina AI */
        // this.router.get("/jina", helloWorld)
        this.router.get("/jina/:url", jinaAICrawl)

        /**
         * Machines by Arachnefly
         */

        // Get Machine Details
        this.router.get("/machines/machine/:id", this.requirePaidAccess, arachnefly.getMachine)

        // Check if the image is deployable
        this.router.get("/machines/check-image", this.requirePaidAccess, arachnefly.checkImageDeployability)

        // wait for a machine to stabilize a specific state and return the machine details
        this.router.get("/machines/machine/waitforstate/:machineId", this.requirePaidAccess, arachnefly.waitForState)


        /**
         * Crawler by crawlagent
         */

        // Get New Temporary Task Id
        // this.router.get("/crawl/job/temp-task-id", crawlagent.getTempTaskId)

        // // Get the Task Id
        // this.router.get("/crawl/job/:tempTaskId", crawlagent.getTaskId)

        // // Get the Task Status
        // this.router.get("/crawl/stream/job/status/:taskId", crawlagent.getTaskStatus)

        // // Stream the Task Results
        // this.router.get("/crawl/stream/job/:taskId", crawlagent.streamTaskResults)
    }

    /**
     * https Router Post
     */

    private httpRoutesPosts(): void {
        this.router.post("/anthropic/messages", this.requirePaidAccess, anthropicAICore) // Search for Markets
        this.router.post("/openai/chat/completions", this.requirePaidAccess, openaiAICore)
        this.router.post("/groq/chat/completions", this.requirePaidAccess, groqAICore)

        /**
         * Crawler Management by crawlagent
        */

        this.router.post("/crawl", this.requirePaidAccess, crawl4aiCore)

        // Enqueue a stream Crawl Task
        // this.router.post("/crawl/stream/job", crawlagent.multiCrawlEnqueue)

        /* Machines by Arachnefly */

        // Deploy a new Machine
        this.router.post("/machines/deploy", this.requirePaidAccess, arachnefly.deployMachine)
        // this.router.post('/api/machines/logs', receiveLogs)
    }
    /**
           * https Router Put
           */

    private httpRoutesPut(): void {
        /**
         * Machines by Arachnefly
         */

        // Start a Machine
        this.router.put("/machines/machine/:machineId/start", this.requirePaidAccess, arachnefly.startMachine)

        // Suspend a Machine
        this.router.put("/machines/machine/:machineId/suspend", this.requirePaidAccess, arachnefly.suspendMachine)

        // Stop a Machine
        this.router.put("/machines/machine/:machineId/stop", this.requirePaidAccess, arachnefly.stopMachine)


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
        // Destroy a Machine
        this.router.delete("/machines/machine/:machineId", this.requirePaidAccess, arachnefly.destroyMachine)
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
