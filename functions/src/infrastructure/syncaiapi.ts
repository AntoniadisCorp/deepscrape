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
import { requirePermission } from "./authz.middleware"

type BillingChargeContext = {
    uid: string
    amount: number
    bucket: "purchased" | "included"
    action: string
    idempotencyBase: string
}

type OrganizationRole = "owner" | "admin" | "member" | "viewer"

const ORG_ROLE_INVITE_CAP: Record<OrganizationRole, readonly OrganizationRole[]> = {
    owner: ["owner", "admin", "member", "viewer"],
    admin: ["member", "viewer"],
    member: [],
    viewer: [],
}

const getMembershipDocId = (userId: string, orgId: string): string => `${userId}_${orgId}`

const getOrganizationMembership = async (
    userId: string,
    orgId: string
): Promise<{id: string; orgId?: string; userId?: string; role?: OrganizationRole} | null> => {
    const membershipSnap = await db.collection("memberships").doc(getMembershipDocId(userId, orgId)).get()

    if (!membershipSnap.exists) {
        return null
    }

    return {
        id: membershipSnap.id,
        ...(membershipSnap.data() || {}),
    } as {id: string; orgId?: string; userId?: string; role?: OrganizationRole}
}

const canInviteOrganizationRole = (
    actorRole: OrganizationRole | undefined,
    requestedRole: OrganizationRole
): boolean => {
    if (!actorRole) {
        return false
    }

    return ORG_ROLE_INVITE_CAP[actorRole]?.includes(requestedRole) === true
}

const randomSuffix = (): string => Math.random().toString(36).slice(2, 10)

const getAuthErrorCode = (error: unknown): string => {
    if (typeof error === "object" && error !== null && "code" in error) {
        return String((error as { code?: unknown }).code || "")
    }

    return ""
}

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
            const decodedToken = await auth.verifyIdToken(token, true)
            if (decodedToken) {
                req.user = decodedToken
                req.app.locals["user"] = token // Add user info to the request
                next()
            } else {
                throw new Error("Invalid token")
            }
        } catch (error) {
            console.error("JWT Verification Error:", error)

            const code = getAuthErrorCode(error)
            if (code === "auth/id-token-revoked") {
                res.status(401).json({ error: "Unauthorized: Session revoked", code: "session_revoked" })
                return
            }

            res.status(401).json({ error: "Unauthorized: Invalid token", code: "invalid_token" })
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

    private listOrganizations = async (req: Request, res: Response): Promise<void> => {
        const uid = req.user?.uid
        if (!uid) {
            res.status(401).json({ error: "unauthorized", code: "unauthorized" })
            return
        }

        try {
            const membershipsSnap = await db.collection("memberships")
                .where("userId", "==", uid)
                .limit(100)
                .get()

            const organizations = await Promise.all(membershipsSnap.docs.map(async (membershipDoc) => {
                const membership = membershipDoc.data() as {
                    orgId?: string
                    role?: string
                }

                if (!membership.orgId) {
                    return null
                }

                const orgSnap = await db.collection("organizations").doc(membership.orgId).get()
                if (!orgSnap.exists) {
                    return null
                }

                return {
                    id: orgSnap.id,
                    ...(orgSnap.data() || {}),
                    membership: {
                        role: membership.role || "member",
                    },
                }
            }))

            res.status(200).json({ organizations: organizations.filter(Boolean) })
        } catch (error) {
            console.error("Failed to list organizations:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private getOrganization = async (req: Request, res: Response): Promise<void> => {
        const orgId = req.params.orgId
        if (!orgId) {
            res.status(400).json({ error: "bad_request", code: "bad_request" })
            return
        }

        try {
            const orgSnap = await db.collection("organizations").doc(orgId).get()
            if (!orgSnap.exists) {
                res.status(404).json({ error: "not_found", code: "not_found" })
                return
            }

            res.status(200).json({ id: orgSnap.id, ...(orgSnap.data() || {}) })
        } catch (error) {
            console.error("Failed to get organization:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private createOrganization = async (req: Request, res: Response): Promise<void> => {
        const uid = req.user?.uid
        if (!uid) {
            res.status(401).json({ error: "unauthorized", code: "unauthorized" })
            return
        }

        const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
        if (!name) {
            res.status(400).json({ error: "bad_request", code: "bad_request", message: "name is required" })
            return
        }

        const orgId = `org_${uid}_${Date.now().toString(36)}`
        const membershipId = `${uid}_${orgId}`

        try {
            const batch = db.batch()
            batch.set(db.collection("organizations").doc(orgId), {
                id: orgId,
                name,
                slug: orgId,
                ownerId: uid,
                billingOwnerUid: uid,
                plan: "free",
                createdAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true })

            batch.set(db.collection("memberships").doc(membershipId), {
                id: membershipId,
                orgId,
                userId: uid,
                role: "owner",
                addedBy: uid,
                createdAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true })

            await batch.commit()
            res.status(201).json({ id: orgId })
        } catch (error) {
            console.error("Failed to create organization:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private createInvitation = async (req: Request, res: Response): Promise<void> => {
        const uid = req.user?.uid
        const orgId = req.params.orgId
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
        const role = typeof req.body?.role === "string" ? req.body.role as OrganizationRole : "member"

        if (!uid) {
            res.status(401).json({ error: "unauthorized", code: "unauthorized" })
            return
        }

        if (!orgId || !email) {
            res.status(400).json({ error: "bad_request", code: "bad_request", message: "orgId and email are required" })
            return
        }

        const allowedRoles = new Set(["owner", "admin", "member", "viewer"])
        if (!allowedRoles.has(role)) {
            res.status(400).json({ error: "bad_request", code: "bad_request", message: "invalid invitation role" })
            return
        }

        try {
            const actorMembership = await getOrganizationMembership(uid, orgId)
            const actorRole = actorMembership?.role

            if (!actorMembership || !canInviteOrganizationRole(actorRole, role)) {
                res.status(403).json({ error: "forbidden", code: "forbidden", message: "inviter cannot assign that organization role" })
                return
            }

            const existingInvite = await db.collection("invitations")
                .where("orgId", "==", orgId)
                .where("email", "==", email)
                .where("status", "==", "pending")
                .limit(1)
                .get()

            if (!existingInvite.empty) {
                res.status(200).json({ id: existingInvite.docs[0].id, deduplicated: true })
                return
            }

            const inviteRef = db.collection("invitations").doc()
            await inviteRef.set({
                id: inviteRef.id,
                orgId,
                email,
                role,
                invitedBy: uid,
                status: "pending",
                createdAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true })

            res.status(201).json({ id: inviteRef.id })
        } catch (error) {
            console.error("Failed to create invitation:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private listOrganizationMembers = async (req: Request, res: Response): Promise<void> => {
        const orgId = req.params.orgId
        if (!orgId) {
            res.status(400).json({ error: "bad_request", code: "bad_request" })
            return
        }

        try {
            const membershipsSnap = await db.collection("memberships")
                .where("orgId", "==", orgId)
                .limit(200)
                .get()

            const members = membershipsSnap.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() || {}),
            }))

            res.status(200).json({ members })
        } catch (error) {
            console.error("Failed to list organization members:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private removeOrganizationMember = async (req: Request, res: Response): Promise<void> => {
        const actorUid = req.user?.uid
        const orgId = req.params.orgId
        const memberUid = req.params.userId
        if (!actorUid || !orgId || !memberUid) {
            res.status(400).json({ error: "bad_request", code: "bad_request" })
            return
        }

        try {
            const actorMembership = await getOrganizationMembership(actorUid, orgId)
            const memberMembership = await getOrganizationMembership(memberUid, orgId)

            if (!actorMembership?.role || !memberMembership?.role) {
                res.status(404).json({ error: "not_found", code: "not_found" })
                return
            }

            if (memberMembership.role === "owner" && actorMembership.role !== "owner") {
                res.status(403).json({ error: "forbidden", code: "forbidden", message: "Only an owner can remove another owner" })
                return
            }

            if (actorUid === memberUid && actorMembership.role === "owner") {
                const ownersSnap = await db.collection("memberships")
                    .where("orgId", "==", orgId)
                    .where("role", "==", "owner")
                    .limit(2)
                    .get()

                if (ownersSnap.size <= 1) {
                    res.status(409).json({ error: "conflict", code: "last_owner", message: "Cannot remove the last owner from the organization" })
                    return
                }
            }

            const membershipId = `${memberUid}_${orgId}`
            await db.collection("memberships").doc(membershipId).delete()
            res.status(204).send()
        } catch (error) {
            console.error("Failed to remove organization member:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private listOrgInvitations = async (req: Request, res: Response): Promise<void> => {
        const uid = req.user?.uid
        const orgId = req.params.orgId
        if (!uid) {
            res.status(401).json({ error: "unauthorized", code: "unauthorized" })
            return
        }
        if (!orgId) {
            res.status(400).json({ error: "bad_request", code: "bad_request", message: "orgId is required" })
            return
        }

        try {
            const invitesSnap = await db.collection("invitations")
                .where("orgId", "==", orgId)
                .where("status", "==", "pending")
                .limit(100)
                .get()

            const orgSnap = await db.collection("organizations").doc(orgId).get()
            const orgName = orgSnap.exists ? (orgSnap.data()?.name || orgId) : orgId

            const invitations = invitesSnap.docs.map((doc) => ({
                id: doc.id,
                orgName,
                ...(doc.data() || {}),
            }))

            res.status(200).json({ invitations })
        } catch (error) {
            console.error("Failed to list org invitations:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private listMyInvitations = async (req: Request, res: Response): Promise<void> => {
        const uid = req.user?.uid
        if (!uid) {
            res.status(401).json({ error: "unauthorized", code: "unauthorized" })
            return
        }

        try {
            const tokenEmail = req.user?.email?.toLowerCase()
            const userRecord = tokenEmail ? null : await auth.getUser(uid)
            const userEmail = tokenEmail || userRecord?.email?.toLowerCase()

            if (!userEmail) {
                res.status(400).json({ error: "bad_request", code: "bad_request", message: "user email unavailable" })
                return
            }

            const invitesSnap = await db.collection("invitations")
                .where("email", "==", userEmail)
                .where("status", "==", "pending")
                .limit(200)
                .get()

            // Fetch org details for enrichment
            const orgIds = new Set<string>()
            invitesSnap.docs.forEach((doc) => {
                const data = doc.data()
                if (data?.orgId) {
                    orgIds.add(data.orgId)
                }
            })

            const orgMap: Record<string, string> = {}
            for (const orgId of orgIds) {
                try {
                    const orgSnap = await db.collection("organizations").doc(orgId).get()
                    orgMap[orgId] = orgSnap.exists ? (orgSnap.data()?.name || orgId) : orgId
                } catch (e) {
                    orgMap[orgId] = orgId
                }
            }

            const invitations = invitesSnap.docs.map((doc) => {
                const data = doc.data()
                return {
                    id: doc.id,
                    orgName: orgMap[data?.orgId] || data?.orgId,
                    ...(data || {}),
                }
            })

            res.status(200).json({ invitations })
        } catch (error) {
            console.error("Failed to list invitations:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private acceptInvitation = async (req: Request, res: Response): Promise<void> => {
        const uid = req.user?.uid
        const invitationId = req.params.invitationId
        if (!uid || !invitationId) {
            res.status(400).json({ error: "bad_request", code: "bad_request" })
            return
        }

        try {
            const inviteRef = db.collection("invitations").doc(invitationId)
            const inviteSnap = await inviteRef.get()

            if (!inviteSnap.exists) {
                res.status(404).json({ error: "not_found", code: "not_found" })
                return
            }

            const invitation = inviteSnap.data() as {
                email?: string
                orgId?: string
                role?: string
                status?: string
            }

            if (!invitation.orgId || !invitation.email) {
                res.status(400).json({ error: "bad_request", code: "bad_request", message: "invalid invitation payload" })
                return
            }

            if (invitation.status !== "pending") {
                res.status(409).json({ error: "conflict", code: "invitation_not_pending" })
                return
            }

            const tokenEmail = req.user?.email?.toLowerCase()
            const userRecord = tokenEmail ? null : await auth.getUser(uid)
            const userEmail = tokenEmail || userRecord?.email?.toLowerCase()

            if (!userEmail || userEmail !== invitation.email.toLowerCase()) {
                res.status(403).json({ error: "forbidden", code: "invitation_email_mismatch" })
                return
            }

            const role = (invitation.role || "member") as OrganizationRole
            const membershipId = `${uid}_${invitation.orgId}`

            const existingMembership = await getOrganizationMembership(uid, invitation.orgId)
            if (existingMembership) {
                res.status(409).json({ error: "conflict", code: "already_member" })
                return
            }

            const batch = db.batch()
            batch.set(db.collection("memberships").doc(membershipId), {
                id: membershipId,
                orgId: invitation.orgId,
                userId: uid,
                role,
                addedBy: invitation.orgId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true })

            batch.set(inviteRef, {
                status: "accepted",
                acceptedBy: uid,
                acceptedAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true })

            batch.set(db.collection("users").doc(uid), {
                defaultOrgId: invitation.orgId,
                updated_At: new Date(),
            }, { merge: true })

            await batch.commit()

            res.status(200).json({
                invitationId,
                orgId: invitation.orgId,
                role,
                accepted: true,
            })
        } catch (error) {
            console.error("Failed to accept invitation:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    private renameOrganization = async (req: Request, res: Response): Promise<void> => {
        const orgId = req.params.orgId
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""

        if (!orgId || name.length < 2 || name.length > 64) {
            res.status(400).json({ error: "bad_request", code: "bad_request", message: "name must be between 2 and 64 characters" })
            return
        }

        try {
            await db.collection("organizations").doc(orgId).set({
                name,
                updatedAt: new Date(),
            }, { merge: true })
            res.status(204).send()
        } catch (error) {
            console.error("Failed to rename organization:", error)
            res.status(500).json({ error: "internal", code: "internal" })
        }
    }

    // ------------------- Node JS Routes -------------------

    /**
     * https Router Gets
     */

    private httpRoutesGets(): void {
        this.router.get("/orgs", requirePermission("organization", "read"), this.listOrganizations)
        this.router.get("/orgs/:orgId", requirePermission("organization", "read"), this.getOrganization)
        this.router.get("/orgs/:orgId/members", requirePermission("organization", "read"), this.listOrganizationMembers)
        this.router.get("/orgs/invitations/me", requirePermission("organization", "read"), this.listMyInvitations)
        this.router.get("/orgs/:orgId/invitations", requirePermission("organization", "invite"), this.listOrgInvitations)

        /* Jina AI */
        this.router.get("/jina/:url", this.requirePaidAccess, requirePermission("ai", "execute"), jinaAICrawl)

        /**
         * Machines by Arachnefly
         */

        // Get Machine Details
        this.router.get("/machines/machine/:id", this.requirePaidAccess, requirePermission("machine", "read"), arachnefly.getMachine)

        // Check if the image is deployable
        this.router.get("/machines/check-image", this.requirePaidAccess, requirePermission("machine", "read"), arachnefly.checkImageDeployability)

        // wait for a machine to stabilize a specific state and return the machine details
        this.router.get("/machines/machine/waitforstate/:machineId", this.requirePaidAccess, requirePermission("machine", "read"), arachnefly.waitForState)


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
        this.router.post("/orgs", requirePermission("organization", "manage"), this.createOrganization)
        this.router.post("/orgs/:orgId/invitations", requirePermission("organization", "invite"), this.createInvitation)
        this.router.post("/orgs/invitations/:invitationId/accept", requirePermission("organization", "read"), this.acceptInvitation)

        this.router.post("/anthropic/messages", this.requirePaidAccess, requirePermission("ai", "execute"), anthropicAICore) // Search for Markets
        this.router.post("/openai/chat/completions", this.requirePaidAccess, requirePermission("ai", "execute"), openaiAICore)
        this.router.post("/groq/chat/completions", this.requirePaidAccess, requirePermission("ai", "execute"), groqAICore)

        /**
         * Crawler Management by crawlagent
        */

        this.router.post("/crawl", this.requirePaidAccess, requirePermission("crawl", "execute"), crawl4aiCore)

        // Enqueue a stream Crawl Task
        // this.router.post("/crawl/stream/job", crawlagent.multiCrawlEnqueue)

        /* Machines by Arachnefly */

        // Deploy a new Machine
        this.router.post("/machines/deploy", this.requirePaidAccess, requirePermission("machine", "deploy"), arachnefly.deployMachine)
        // this.router.post('/api/machines/logs', receiveLogs)
    }

    /**
       * https Router Put
       */

    private httpRoutesPut(): void {
        this.router.put("/orgs/:orgId", requirePermission("organization", "manage"), this.renameOrganization)

        /**
         * Machines by Arachnefly
         */

        // Start a Machine
        this.router.put("/machines/machine/:machineId/start", this.requirePaidAccess, requirePermission("machine", "update"), arachnefly.startMachine)

        // Suspend a Machine
        this.router.put("/machines/machine/:machineId/suspend", this.requirePaidAccess, requirePermission("machine", "update"), arachnefly.suspendMachine)

        // Stop a Machine
        this.router.put("/machines/machine/:machineId/stop", this.requirePaidAccess, requirePermission("machine", "update"), arachnefly.stopMachine)


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
        this.router.delete("/orgs/:orgId/members/:userId", requirePermission("organization", "manage"), this.removeOrganizationMember)

        /**
         * Machines by Arachnefly
         */
        // Destroy a Machine
        this.router.delete("/machines/machine/:machineId", this.requirePaidAccess, requirePermission("machine", "delete"), arachnefly.destroyMachine)
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
