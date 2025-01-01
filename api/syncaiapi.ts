import { Request, Response, Router } from "express"
import fetch from 'node-fetch';
import { JinaHeader } from "./types";
import { customUrlDecoder } from "./fun";


class SyncAIapis {

    public router: Router



    // public tk103: tk103Device
    constructor() {



        this.router = Router()
        this.httpRoutesGets()
        this.httpRoutesPosts()
        this.httpRoutesPut()
        this.httpRoutesDelete()
    }



    // ------------------- Node JS Routes ------------------- 

    /**
     * https Router Gets
     */

    httpRoutesGets(): void {
        this.router.get('/jina', async (req: Request, res: Response) => {

            try {
                res.status(200).json({ message: 'Hello from the server!' });
            } catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: 'Failed to connect to the API' });
            }
        })

        this.router.get('/jina/:url', async (req: Request, res: Response) => {
            const { url } = req.params;
            const apiKey = process.env["JINAAI_API_KEY"]

            let headers: JinaHeader = {
                'Authorization': `Bearer ${apiKey}`,
                "Accept": "application/json",
                "X-With-Iframe": req.headers['x-with-iframe'] as string || 'false',
                "X-Return-Format": req.headers["x-return-format"] as string || "markdown",
                "X-Target-Selector": req.headers["x-target-selector"] as string || "body",
                "X-With-Generated-Alt": req.headers["x-with-generated-alt"] as string || "true",
            };

            if (req.headers['x-set-cookie']?.length) {
                headers['X-Set-Cookie'] = req.headers['x-set-cookie'] as string;
            }
            // const decodedUrl = decodeURIComponent(url); // decode the URL
            const apiUrl = `https://r.jina.ai/${customUrlDecoder(url)}`;

            try {
                const apiResponse = await fetch(apiUrl, {
                    method: 'GET',
                    headers: headers,
                })

                if (!apiResponse.ok) {
                    throw new Error(`API error: ${apiResponse.statusText}`);
                }
                const buffer = await apiResponse.arrayBuffer();
                res.writeHead(200, {
                    'Content-Type': 'application/octet-stream',
                });
                res.end(Buffer.from(buffer));
            }
            catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: 'Failed to connect to jina API' });
            }
        })
    }

    /**
     * https Router Post
     */

    httpRoutesPosts(): void {
        this.router.post('/anthropic/messages',/*  isJwtAuth, */async (req: Request, res: Response) => {
            const apiUrl = 'https://api.anthropic.com/v1/messages';
            const apiKey = process.env["ANTHROPIC_API_KEY"];
            // console.log(apiKey,)
            try {
                const apiResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': req.headers['anthropic-version'],
                        'content-type': req.headers['content-type'],
                    } as any,
                    body: JSON.stringify(req.body),
                })

                if (!apiResponse.ok) {
                    throw new Error(`API error: ${apiResponse.statusText}`);
                }

                // Stream data from Anthropic to the client
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
                    'Connection': 'keep-alive',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                });


                // Accumulate chunks and send them line-by-line
                let buffer = '';

                apiResponse.body.on('data', (chunk: Buffer) => {
                    const text = new TextDecoder('utf-8').decode(chunk);
                    buffer += text;

                    let boundary: number;
                    while ((boundary = buffer.indexOf('\n')) !== -1) {
                        const jsonChunk = buffer.slice(0, boundary).trim();
                        buffer = buffer.slice(boundary + 1);

                        if (jsonChunk) {
                            res.write(`${jsonChunk}\n`); // Send chunked data as JSON
                        }
                    }
                });

                apiResponse.body.on('end', () => {
                    if (buffer.trim()) {
                        res.write(`${buffer.trim()}\n`); // Send remaining data
                    }
                    res.end();
                });

                apiResponse.body.on('error', (error: Error) => {
                    console.error('Stream error:', error);
                    res.status(500).end('Stream error');
                });
            } catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: 'Failed to connect to Anthropic API' });
            }

        }) // Search for Markets

        this.router.post('/openai/chat/completions', async (req: Request, res: Response) => {
            const apiUrl = 'https://api.openai.com/v1/chat/completions';
            const apiKey = process.env["OPENAI_API_KEY"];
            try {
                const apiResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(req.body),
                })
                if (!apiResponse.ok) {
                    throw new Error(`API error: ${apiResponse.statusText}`);
                }
                // Stream data from OpenAI to the client
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
                    'Connection': 'keep-alive',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                });
                // Accumulate chunks and send them line-by-line
                let buffer = '';

                apiResponse.body.on('data', (chunk: Buffer) => {
                    const text = new TextDecoder('utf-8').decode(chunk);
                    buffer += text;

                    let boundary: number;
                    while ((boundary = buffer.indexOf('\n')) !== -1) {
                        const jsonChunk = buffer.slice(0, boundary).trim();
                        buffer = buffer.slice(boundary + 1);

                        if (jsonChunk) {
                            res.write(`${jsonChunk}\n`); // Send chunked data as JSON
                        }
                    }
                });

                apiResponse.body.on('end', () => {
                    if (buffer.trim()) {
                        res.write(`${buffer.trim()}\n`); // Send remaining data
                    }
                    res.end();
                });

                apiResponse.body.on('error', (error: Error) => {
                    console.error('Stream error:', error);
                    res.status(500).end('Stream error');
                });
            }
            catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: 'Failed to connect to OpenAI API' });
            }
        })

        this.router.post('/groq/chat/completions', async (req: Request, res: Response) => {
            const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
            const apiKey = process.env["GROQ_API_KEY"];
            try {
                const apiResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(req.body),
                })
                if (!apiResponse.ok) {
                    throw new Error(`API error: ${apiResponse.statusText}`);
                }
                // Stream data from OpenAI to the client
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
                    'Connection': 'keep-alive',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                });

                // Accumulate chunks and send them line-by-line
                let buffer = '';

                apiResponse.body.on('data', (chunk: Buffer) => {
                    const text = new TextDecoder('utf-8').decode(chunk);
                    buffer += text;

                    let boundary: number;
                    while ((boundary = buffer.indexOf('\n')) !== -1) {
                        const jsonChunk = buffer.slice(0, boundary).trim();
                        buffer = buffer.slice(boundary + 1);

                        if (jsonChunk) {
                            res.write(`${jsonChunk}\n`); // Send chunked data as JSON
                        }
                    }
                });

                apiResponse.body.on('end', () => {
                    if (buffer.trim()) {
                        res.write(`${buffer.trim()}\n`); // Send remaining data
                    }
                    res.end();
                });

                apiResponse.body.on('error', (error: Error) => {
                    console.error('Stream error:', error);
                    res.status(500).end('Stream error');
                });

            }
            catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: 'Failed to connect to GROQAI API' });
            }
        })


    }
    /**
     * https Router Put
     */

    httpRoutesPut(): void {

    }

    /**
     * https Router Delete
     */

    httpRoutesDelete(): void {

    }

}

export { SyncAIapis }