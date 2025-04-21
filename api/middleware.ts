import { Request, Response } from "express"
import { auth as admin } from "../functions/src/app/config"
import { JinaHeader } from "./types"

export const crawl4aiCore = async (req: Request, res: Response) => {
    // const decodedUrl = decodeURIComponent(url) // decode the URL
    const apiUrl = `${process.env["API_CRAWL4AI_URL"]}/crawl`
    const { urls, priority } = req.body
    const body = {
        urls,
        priority
    }

    // const apiKey = process.env["JINAAI_API_KEY"]

    let headers: JinaHeader = {
        'Authorization': `${req.headers['authorization'] as string || 'Bearer '}`,
        "Accept": req.headers['accept'] as string || "application/json",
        "X-With-Iframe": req.headers['x-with-iframe'] as string || 'false',
        "X-Return-Format": req.headers["x-return-format"] as string || "markdown",
        "X-Target-Selector": req.headers["x-target-selector"] as string || "body",
        "X-With-Generated-Alt": req.headers["x-with-generated-alt"] as string || "true",
    }

    if (req.headers['x-set-cookie']?.length) {
        headers['X-Set-Cookie'] = req.headers['x-set-cookie'] as string
    }

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
        })

        if (!apiResponse.ok)
            throw new Error(`API error: ${apiResponse.statusText}`)

        const buffer = await apiResponse.arrayBuffer()
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
        })

        res.end(Buffer.from(buffer))
    }
    catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Failed to connect to crawl API' })
    }
}

export const receiveLogs = async (request: Request, response: Response) => {

    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.status(401).send('Unauthorized')
    }

    const token = authHeader.split('Bearer ')[1]
    try {
        await admin.verifyIdToken(token);
        const logs = request.body.split('\n').filter(Boolean)
        logs.forEach((log: any) => {
            console.log(log)
            // pusher.trigger('logs-channel', 'new-log', JSON.parse(log));
        });
        return response.sendStatus(200)
    } catch (error) {
        console.error('Error:', error);
        return response.status(401).send('Invalid Token');
    }

}