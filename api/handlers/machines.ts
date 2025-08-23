import { Request, Response, NextFunction } from "express"
import fetch, { RequestInit } from 'node-fetch'
// import { URLSearchParams } from 'node:url'
class MachinesHandler {

    private apiUrl
    constructor() {
        this.apiUrl = process.env['API_ARACHNEFLY_URL'] || 'http://localhost:3000'
    }

    async checkImageDeployability(req: Request, res: Response, next: NextFunction) {
        const { name } = req.query
        const imageName: string = typeof name === 'string' ? decodeURIComponent(name) : ''
        if (!imageName) {
            res.status(400).json({ error: 'Invalid image name' })
            console.log('Invalid image name: ', imageName)
            return
        }
        // get tken from request include in locals
        const token = req.app.locals["user"]

        // const authHeader = req.headers["api-key"] as string;
        const url: URL = new URL(`${this.apiUrl}/api/check-image`)
        url.searchParams.set('name', name as string)

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }

        try {
            const fetchOptions: RequestInit = {
                method: 'GET',
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok)
                throw new Error(`${apiResponse.statusText} - ${JSON.stringify(await apiResponse.json())}`)

            if (!apiResponse.body)
                throw new Error('API response body is empty')

            const buffer = await apiResponse.arrayBuffer()
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': buffer.byteLength, // Add Content-Length header
            })

            // await streamPipeline(apiResponse.body, res);
            res.end(Buffer.from(buffer))


        } catch (error) {
            console.warn('API Error:', error)
            res.status(500).json({ error: 'Failed to check image deployability. Please try again later.' })
        }

    }


    async createMachine(req: Request, res: Response, next: NextFunction) {
        const { region, clone } = req.query



        // get tken from request include in locals
        const token = req.app.locals["user"]

        // set headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }

        // const authHeader = req.headers["api-key"] as string;
        const url: URL = new URL(`${this.apiUrl}/api/deploy`)
        url.searchParams.set('region', region as string)
        url.searchParams.set('clone', clone as string)

        try {
            const fetchOptions: RequestInit = {
                method: 'GET',
                headers: headers,
                compress: true,
            }

            const apiResponse = await fetch(url, fetchOptions)

            if (!apiResponse.ok)
                throw new Error(`${apiResponse.statusText} - ${JSON.stringify(await apiResponse.json())}`)

            if (!apiResponse.body)
                throw new Error('API response body is empty')


        } catch (error) {
            console.warn('API Error:', error)
            res.status(500).json({ error: 'Failed to create machine. Please try again later.' })
        }
    }

}
const arachnefly = new MachinesHandler()
export { arachnefly }
