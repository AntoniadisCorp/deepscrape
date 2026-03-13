import { NextFunction, Request, Response, Router } from "express"
import {
    anthropicAICore, openaiAICore, groqAICore, crawl4aiCore, jinaAICrawl,
    helloWorld, arachnefly
} from "./handlers"

interface AuthenticatedRequest extends Request {
    user?: any
}


class SyncAIapis {

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
        const authHeader = (req.headers["api-key"] as string) || (req.headers["authorization"] as string)

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const request = req as AuthenticatedRequest

        try {
            const decodedToken = token/* await auth.verifyIdToken(token) */
            if (decodedToken) {
                request.user = decodedToken
                req.app.locals["user"] = token
                next()
            } else {
                throw new Error('Invalid token')
            }
        } catch (error) {
            console.error('JWT Verification Error:', error);
            res.status(401).json({ error: 'Unauthorized: Invalid token' })
        }
    }

    // async requirePaidAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     const request = req as AuthenticatedRequest
    //     const uid = request.user?.uid
    //     if (!uid) {
    //         res.status(401).json({ error: 'unauthorized', code: 'unauthorized' })
    //         return
    //     }

    //     try {
    //         const billingRef = db.doc(`users/${uid}/billing/current`)
    //         const billingSnap = await billingRef.get()

    //         const now = Date.now()
    //         if (billingSnap.exists) {
    //             const billing = billingSnap.data() as {
    //                 plan?: string
    //                 graceUntil?: string | null
    //                 credits?: { balance?: number; reserved?: number }
    //             }

    //             const plan = (billing.plan || 'free').toLowerCase()
    //             const paidPlans = new Set(['trial', 'starter', 'pro', 'enterprise'])
    //             const hasPaidPlan = paidPlans.has(plan)
    //             const balance = Number(billing.credits?.balance || 0)
    //             const reserved = Number(billing.credits?.reserved || 0)
    //             const hasCredits = balance - reserved > 0
    //             const hasGrace = !!billing.graceUntil && now < new Date(billing.graceUntil).getTime()

    //             if (hasPaidPlan || hasCredits || hasGrace) {
    //                 next()
    //                 return
    //             }
    //         }

    //         res.status(402).json({
    //             error: 'payment_required',
    //             code: 'payment_required',
    //             message: 'Payment required to access this endpoint',
    //         })
    //     } catch (error) {
    //         console.error('Payment gate check failed:', error)
    //         res.status(500).json({ error: 'internal', code: 'internal' })
    //     }
    // }

    // ------------------- Node JS Routes ------------------- 

    /**
     * https Router Gets
     */

    private httpRoutesGets(): void {

        /* Jina AI */
        this.router.get('/jina', helloWorld)
        this.router.get('/jina/:url',
            jinaAICrawl)

        /* Machines by Arachnefly */
        // Check if the image is deployable
        this.router.get('/machines/check-image', arachnefly.checkImageDeployability)


        /* Crawl Agent */
        // this.router.get('/crawl', this.isJwtAuth, crawl4aiCore)
    }

    /**
     * https Router Post
     */

    private httpRoutesPosts(): void {
        this.router.post('/anthropic/messages'/* , this.requirePaidAccess */, anthropicAICore) // Search for Markets
        this.router.post('/openai/chat/completions'/* , this.requirePaidAccess */, openaiAICore)
        this.router.post('/groq/chat/completions'/* , this.requirePaidAccess */, groqAICore)
        this.router.post('/crawl'/* , this.requirePaidAccess */, crawl4aiCore)


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

export { SyncAIapis }