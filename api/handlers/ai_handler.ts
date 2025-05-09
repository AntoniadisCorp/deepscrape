import { Request, Response } from "express"
// import { auth as admin } from "../../functions/src/app/config"
import { JinaHeader } from "../types"
import { customUrlDecoder } from "api/fun"
import fetch, { RequestInit } from 'node-fetch';
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'

const streamPipeline = promisify(pipeline)

// Utility function to handle API requests and streaming
const handleStreamedApiResponse = async (
    apiUrl: string,
    fetchOptions: RequestInit,
    res: Response,
    apiName: string,
    contentType: string = 'text/event-stream'
) => {
    try {
        const apiResponse = await fetch(apiUrl, fetchOptions)

        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.statusText}`)
        }

        if (!apiResponse.body) {
            throw new Error('API response body is empty')
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache',
            'Expires': '0',
        })

        // Use pipeline to directly pipe the API's response stream to the client's response stream
        await streamPipeline(apiResponse.body, res)

    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: `Failed to connect to ${apiName} API` })
    }
}

export const crawl4aiCore = async (req: Request, res: Response) => {
    // const decodedUrl = decodeURIComponent(url) // decode the URL
    const apiUrl = `${process.env["API_CRAWL4AI_URL"]}/crawl`
    const { urls, priority } = req.body
    const body = {
        urls,
        priority
    }

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

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            compress: true,
        }

        const apiResponse = await fetch(apiUrl, fetchOptions)

        if (!apiResponse.ok)
            throw new Error(`API error: ${apiResponse.statusText}`)

        if (!apiResponse.body)
            throw new Error('API response body is empty')


        const buffer = await apiResponse.arrayBuffer()
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.byteLength // Add Content-Length header
        })

        // await streamPipeline(apiResponse.body, res);
        res.end(Buffer.from(buffer))
    }
    catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Failed to stream on crawl API' })
    }
}

export const jinaAICrawl = async (req: Request, res: Response) => {
    const { url, /* token */ } = req.params
    const apiKey = process.env["JINAAI_API_KEY"]

    let headers: JinaHeader = {
        'Authorization': `Bearer ${apiKey}`,
        "Accept": "application/json",
        "X-With-Iframe": req.headers['x-with-iframe'] as string || 'false',
        "X-Return-Format": req.headers["x-return-format"] as string || "markdown",
        "X-Target-Selector": req.headers["x-target-selector"] as string || "body",
        "X-With-Generated-Alt": req.headers["x-with-generated-alt"] as string || "true",
    }

    if (req.headers['x-set-cookie']?.length) {
        headers['X-Set-Cookie'] = req.headers['x-set-cookie'] as string
    }
    // const decodedUrl = decodeURIComponent(url) // decode the URL
    const apiUrl = `https://r.jina.ai/${customUrlDecoder(url)}`

    try {

        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: headers,
        }

        const apiResponse = await fetch(apiUrl, fetchOptions)

        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.statusText}`)
        }
        if (!apiResponse.body) {
            throw new Error('API response body is empty')
        }
        const buffer = await apiResponse.arrayBuffer()
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.byteLength, // Add Content-Length header
        })

        // await streamPipeline(apiResponse.body, res);
        res.end(Buffer.from(buffer))
    }
    catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Failed to stream on jina API' })
    }
}

export const anthropicAICore = async (req: Request, res: Response) => {
    const apiUrl = 'https://api.anthropic.com/v1/messages'
    const apiKey = process.env["ANTHROPIC_API_KEY"]
    // console.log(apiKey,)
    try {

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': req.headers['anthropic-version'],
                'content-type': req.headers['content-type'],
            } as any,
            body: JSON.stringify(req.body),
        }
        const apiResponse = await fetch(apiUrl)

        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.statusText}`)
        }

        if (!apiResponse.body) {
            throw new Error('API response body is empty')

        }
        // Stream data from Anthropic to the client
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache',
            'Expires': '0',
        })

        // await handleStreamedApiResponse(apiUrl, fetchOptions, res, 'Anthropic')

        // Accumulate chunks and send them line-by-line
        let buffer = ''

        apiResponse.body.on('data', (chunk: Buffer) => {
            const text = new TextDecoder('utf-8').decode(chunk)
            buffer += text

            let boundary: number
            while ((boundary = buffer.indexOf('\n')) !== -1) {
                const jsonChunk = buffer.slice(0, boundary).trim()
                buffer = buffer.slice(boundary + 1)

                if (jsonChunk) {
                    if (!res.write(`${jsonChunk}\n`)) { // Send chunked data as JSON
                        apiResponse.body?.pause()  // Pause the stream if backpressure occurs
                        res.once('drain', () => {
                            apiResponse.body?.resume()  // Resume the stream when the client is ready
                        });
                    }

                }
            }
        })

        apiResponse.body.on('end', () => {
            if (buffer.trim()) {
                if (!res.write(`${buffer.trim()}\n`)) { // Send remaining data
                    apiResponse.body?.pause()  // Pause the stream if backpressure occurs
                    res.once('drain', () => {
                        apiResponse.body?.resume()  // Resume the stream when the client is ready
                    });
                }

            }
            res.end()
        })

        apiResponse.body.on('error', (error: Error) => {
            console.error('Stream error:', error)
            res.status(500).end('Stream error')
        })
    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Failed to stream on Anthropic API' })
    }

}

export const openaiAICore = async (req: Request, res: Response) => {
    const apiUrl = process.env["OPENAI_API_URL"] || 'https://api.openai.com/v1/chat/completions'
    const apiKey = process.env["OPENAI_API_KEY"]
    try {
        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(req.body),
        }

        // await handleStreamedApiResponse(apiUrl, fetchOptions, res, 'OpenAI')

        const apiResponse = await fetch(apiUrl, fetchOptions)
        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.statusText}`)
        }

        if (!apiResponse.body) {
            throw new Error('API response body is empty')
        }

        // Stream data from OpenAI to the client
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache',
            'Expires': '0',
        })
        // Accumulate chunks and send them line-by-line
        let buffer = ''

        apiResponse.body.on('data', (chunk: Buffer) => {
            const text = new TextDecoder('utf-8').decode(chunk)
            buffer += text

            let boundary: number
            while ((boundary = buffer.indexOf('\n')) !== -1) {
                const jsonChunk = buffer.slice(0, boundary).trim()
                buffer = buffer.slice(boundary + 1)

                if (jsonChunk) {
                    if (!res.write(`${jsonChunk}\n`)) {
                        apiResponse.body?.pause()  // Pause the stream if backpressure occurs
                        res.once('drain', () => {
                            apiResponse.body?.resume()  // Resume the stream when the client is ready
                        });
                    } // Send chunked data as JSON

                }
            }
        })

        apiResponse.body.on('end', () => {
            if (buffer.trim()) {
                res.write(`${buffer.trim()}\n`) // Send remaining data
            }
            res.end()
        })

        apiResponse.body.on('error', (error: Error) => {
            console.error('Stream error:', error)
            res.status(500).end('Stream error')
        })
    }
    catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Failed to connect to OpenAI API' })
    }
}

export const groqAICore = async (req: Request, res: Response) => {
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions'
    const apiKey = process.env["GROQ_API_KEY"]
    try {
        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        }

        // await handleStreamedApiResponse(apiUrl, fetchOptions, res, 'GROQAI')

        const apiResponse = await fetch(apiUrl, fetchOptions)
        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.statusText}`)
        }

        if (!apiResponse.body) {
            throw new Error('API response body is empty')
        }
        // Stream data from OpenAI to the client
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache',
            'Expires': '0',
        })

        // Accumulate chunks and send them line-by-line
        let buffer = ''

        apiResponse.body.on('data', (chunk: Buffer) => {
            const text = new TextDecoder('utf-8').decode(chunk)
            buffer += text

            let boundary: number
            while ((boundary = buffer.indexOf('\n')) !== -1) {
                const jsonChunk = buffer.slice(0, boundary).trim()
                buffer = buffer.slice(boundary + 1)

                if (jsonChunk) {
                    if (!res.write(`${jsonChunk}\n`)) {
                        apiResponse.body?.pause()  // Pause the stream if backpressure occurs
                        res.once('drain', () => {
                            apiResponse.body?.resume()  // Resume the stream when the client is ready
                        });
                    } // Send chunked data as JSON

                }
            }
        })

        apiResponse.body.on('end', () => {
            if (buffer.trim()) {
                res.write(`${buffer.trim()}\n`) // Send remaining data
            }
            res.end()
        })

        apiResponse.body.on('error', (error: Error) => {
            console.error('Stream error:', error)
            res.status(500).end('Stream error')
        })

    }
    catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Failed to connect to GROQAI API' })
    }
}



// export const receiveLogs = async (request: Request, response: Response) => {

//     const authHeader = request.headers.authorization
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return response.status(401).send('Unauthorized')
//     }

//     const token = authHeader.split('Bearer ')[1]
//     try {
//         await admin.verifyIdToken(token);
//         const logs = request.body.split('\n').filter(Boolean)
//         logs.forEach((log: any) => {
//             console.log(log)
//             // pusher.trigger('logs-channel', 'new-log', JSON.parse(log));
//         });
//         return response.sendStatus(200)
//     } catch (error) {
//         console.error('Error:', error);
//         return response.status(401).send('Invalid Token');
//     }

// }