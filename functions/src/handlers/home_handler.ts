/* eslint-disable indent */
/* eslint-disable object-curly-spacing */
import { Request, Response } from "express"

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
        res.status(500).json({ status: "error",
            message: "API status check failed" })
    }
}
