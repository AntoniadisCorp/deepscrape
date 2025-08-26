/* eslint-disable object-curly-spacing */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from "express"
import fetch, { RequestInit } from "node-fetch"
import { Buffer } from "node:buffer" // Import Buffer for file handling
// import FormData from "form-data" // Import FormData for handling form data
import { pipeline } from "node:stream"
import { createGunzip } from "node:zlib"
class MachinesHandler {
    constructor() {
        // this.upload = multer({ storage: multer.memoryStorage() })
    }

    async checkImageDeployability(req: Request, res: Response, next: NextFunction) {
        const { name } = req.query
        const imageName = typeof name === "string" ? decodeURIComponent(name) : ""
        res.type("application/json")
        if (!imageName) {
            res.status(400).json({ error: "Invalid image name" })
            return
        }

        const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] === "true"?
        process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev": "http://localhost:8080"
        const url = new URL(`${apiUrl}/api/check-image`)
        url.searchParams.set("name", imageName)

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }

        try {
            const fetchOptions: RequestInit = {
                method: "GET",
                headers,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
               throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const contentEncoding = apiResponse.headers.get("content-encoding")
            res.setHeader("Content-Type", "application/json")

            if (contentEncoding === "gzip") {
                pipeline(
                    apiResponse.body,
                    createGunzip(),
                    res,
                    (err) => {
                        if (err && !res.headersSent) {
                            res.writeHead(500, { "Content-Type": "text/plain" })
                            res.end("Pipeline error")
                        }
                    }
                )
            } else {
                pipeline(
                    apiResponse.body,
                    res,
                    (err) => {
                        if (err && !res.headersSent) {
                            res.writeHead(500, { "Content-Type": "text/plain" })
                            res.end("Pipeline error")
                        }
                    }
                )
            }
        } catch (error) {
            console.warn("API Error:", error)
            const details = String(error)
            res.status(500).json({ error: "check Image API Deployability did not work. try again later", message: details })
        }
    }

    async getMachine(req: Request, res: Response, next: NextFunction) {
        const machineId: string = req.params.id
        res.type("application/json")
        if (!machineId) {
            res.status(400).json({ error: "Missing required parameter: machineId" })
            return
        }
        // const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] == "true" ? process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev" : "http://localhost:8080"
        const url: URL = new URL(`${apiUrl}/api/machine/${machineId}`)
        const headers = req.headers as any

        try {
            const fetchOptions: RequestInit = {
                method: "GET",
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
                throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": buffer.byteLength,
            })
            res.end(Buffer.from(buffer))
        } catch (error) {
            console.warn("API Error:", error)
            const details = String(error)
            res.status(500).json({ error: "Failed to get machine details. Please try again later.", message: details })
        }
    }

    async deployMachine(req: Request, res: Response, next: NextFunction) {
        // get region and clone from query parameters
        const { region, clone } = req.query

        // get form data from request
        const body = req.body
        // const files = req.files
        res.type("application/json")
        if (!region || !clone || !body) {
            res.status(400).json({ error: "Missing required parameters: region or clone or body" })
            return
        }

        // get tken from request include in locals
        const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] == "true" ? process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev" : "http://localhost:8080"

        // const authHeader = req.headers["api-key"] as string
        // eslint-disable-next-line prefer-const
        let url: URL = new URL(`${apiUrl}/api/deploy`)
        url.searchParams.set("region", region as string)
        url.searchParams.set("clone", clone as string)


        //  // Rebuild FormData for forwarding
        // const form = new FormData()

        // // Add fields
        // for (const [key, value] of Object.entries(body)) {
        //     form.append(key, value)
        // }

        // Add files
        // if (Array.isArray(files)) {
        //     for (const file of files) {
        //         form.append(file.fieldname, file.buffer, {
        //             filename: file.originalname,
        //             contentType: file.mimetype,
        //         })
        //     }
        // }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }

        try {
            const fetchOptions: RequestInit = {
                method: "POST",
                body: JSON.stringify(body),
                headers,
                compress: true,
                // compress: true,
            }
            console.log("Fetch body:", body)
            console.log("API URL:", url.toString())

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
                throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": buffer.byteLength, // Add Content-Length header
            })
            // await streamPipeline(apiResponse.body, res)
            res.end(Buffer.from(buffer))
        } catch (error) {
            const details = String(error)
            console.warn("------------------- API Error:", details)
            res.status(500).json({ error: "Failed to deploy machine. Please try again later.", message: details })
        }
    }

    async waitForState(req: Request, res: Response, next: NextFunction) {
        const { machineId } = req.params
        // eslint-disable-next-line camelcase
        const { instance_id, state, timeout } = req.query
        res.type("application/json")
        // eslint-disable-next-line camelcase
        if (!machineId || !instance_id || !state) {
            res.status(400).json({ error: "Missing required parameters: machineId, instance_id, or state" })
            return
        }

        const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] == "true" ? process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev" : "http://localhost:8080"
        const url: URL = new URL(`${apiUrl}/api/machine/waitforstate/${machineId}`)

        url.searchParams.set("state", state as string)
        // eslint-disable-next-line camelcase
        url.searchParams.set("instance_id", instance_id as string)
        if (timeout) url.searchParams.set("timeout", timeout as string)

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }

        try {
            const fetchOptions: RequestInit = {
                method: "GET",
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
                throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": buffer.byteLength,
            })
            res.end(Buffer.from(buffer))
        } catch (error) {
            console.warn("API Error:", error)
            const details = String(error)
            res.status(500).json({ error: "Failed to wait for machine state. Please try again later.", message: details })
        }
    }

    async startMachine(req: Request, res: Response) {
        const machineId: string = req.params.machineId
        res.type("application/json")
        if (!machineId) {
            res.status(400).json({ error: "Missing required parameter: machineId" })
            return
        }

        const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] == "true" ?
            process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev" : "http://localhost:8080"


        const url: URL = new URL(`${apiUrl}/api/machine/${machineId}/start`)
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }

        try {
            const fetchOptions: RequestInit = {
                method: "PUT",
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
                throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": buffer.byteLength,
            })
            res.end(Buffer.from(buffer))
        } catch (error) {
            console.warn("API Error:", error)
            const details = String(error)
            res.status(500).json({ error: "Failed to destroy machine. Please try again later.", message: details })
        }
    }

    async suspendMachine(req: Request, res: Response) {
        const machineId: string = req.params.machineId
        res.type("application/json")
        if (!machineId) {
            res.status(400).json({ error: "Missing required parameter: machineId" })
            return
        }

        const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] == "true" ?
            process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev" : "http://localhost:8080"

        const url: URL = new URL(`${apiUrl}/api/machine/${machineId}/suspend`)
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }
        try {
            const fetchOptions: RequestInit = {
                method: "PUT",
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
                throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": buffer.byteLength,
            })
            res.end(Buffer.from(buffer))
        } catch (error) {
            console.warn("API Error:", error)
            const details = String(error)
            res.status(500).json({ error: "Failed to destroy machine. Please try again later.", message: details })
        }
    }

    async stopMachine(req: Request, res: Response) {
        const machineId: string = req.params.machineId
        res.type("application/json")
        if (!machineId) {
            res.status(400).json({ error: "Missing required parameter: machineId" })
            return
        }
        const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] == "true" ?
            process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev" : "http://localhost:8080"

        const url: URL = new URL(`${apiUrl}/api/machine/${machineId}/stop`)
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }
        try {
            const fetchOptions: RequestInit = {
                method: "PUT",
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
                throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": buffer.byteLength,
            })
            res.end(Buffer.from(buffer))
        } catch (error) {
            console.warn("API Error:", error)
            const details = String(error)
            res.status(500).json({ error: "Failed to destroy machine. Please try again later.", message: details })
        }
    }

    async destroyMachine(req: Request, res: Response) {
        const machineId: string = req.params.machineId
        const force: boolean = req.query.force === "true"
        res.type("application/json")
        if (!machineId) {
            res.status(400).json({ error: "Missing required parameter: machineId" })
            return
        }

        const token = req.app.locals["user"]
        const apiUrl = process.env["PRODUCTION"] == "true" ?
            process.env["API_ARACHNEFLY_URL"] || "https://arachnefly.fly.dev" : "http://localhost:8080"
        const url: URL = new URL(`${apiUrl}/api/machine/${machineId}`)
        url.searchParams.set("force", force.toString())

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }

        try {
            const fetchOptions: RequestInit = {
                method: "DELETE",
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok) {
                throw new Error(`${JSON.stringify({code: apiResponse.statusText, internal_message: await apiResponse.json()})}`)
            }

            if (!apiResponse.body) {
                throw new Error("API response body is empty")
            }

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": buffer.byteLength,
            })
            res.end(Buffer.from(buffer))
        } catch (error) {
            const details = String(error)
            console.warn("API Error:", details)
            res.status(500).json({ error: "Failed to destroy machine. Please try again later.", message: details })
        }
    }
}
const arachnefly = new MachinesHandler()
export { arachnefly }
