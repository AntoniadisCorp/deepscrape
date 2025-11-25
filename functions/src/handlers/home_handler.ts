/* eslint-disable indent */
/* eslint-disable object-curly-spacing */
import { Request, Response } from "express"
import { redis } from "../app/cacheConfig"
import { db } from "../app/config"

export const helloWorld = async (req: Request, res: Response) => {
    try {
        res.status(200).json({ message: "Hello from the server!" })
    } catch (error) {
        console.error("Error:", error)
        res.status(500).json({ error: "Failed to connect to the API" })
    }
}
export const statusCheck = async (req: Request, res: Response) => {
    try {
        res.status(200).json({ status: "ok", message: "ok" })
    } catch (error) {
        console.error("Error in statusCheck:", error)
        res.status(500).json({
            status: "error",
            message: "API status check failed",
        })
    }
}

export const heartbeat = async (req: Request, res: Response) => {
    try {
        const guestId = req.cookies["gid"]
        const userId = req.cookies["aid"] || req.app.locals["user"]
        const now = new Date()
        let key
        let firestoreCollection
        let id
        if (userId) {
            key = `user:${userId}`
            firestoreCollection = "users"
            id = userId
        } else if (guestId) {
            key = `guest:${guestId}`
            firestoreCollection = "guests"
            id = guestId
        } else {
            // No ID, treat as new guest
            return res.status(400).json({
                success: false,
                message: "No guest or user ID found",
            })
        }
        // Update Redis (fast access)
        await redis.setex(key, 3600, JSON.stringify({ lastSeen: now }))
        // Throttle Firestore writes: only update if lastSeen > 1 min ago
        const docRef = db.collection(firestoreCollection).doc(id)
        const doc = await docRef.get()
        const docData = doc.exists ? doc.data() : undefined
        const lastSeen = docData && docData.lastSeen ?
            new Date(docData.lastSeen) : undefined
        if (!lastSeen || (now.getTime() - lastSeen.getTime() > 60000)) {
            await docRef.set({ lastSeen: now }, { merge: true })
        }
        return res.json({ success: true, lastSeen: now })
    } catch (error) {
        console.error("Heartbeat error:", error)
        return res.status(500).json({
            success: false,
            error: error instanceof Error ?
                error.message : "Unknown error",
        })
    }
}
