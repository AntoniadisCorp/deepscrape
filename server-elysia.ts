import { CommonEngine, isMainModule } from '@angular/ssr/node'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { SyncAIapis } from 'api' // Uncommented and added
import Elysia, { t } from 'elysia'
import { staticPlugin } from '@elysiajs/static'
import { cors } from '@elysiajs/cors'
// import { AngularAppEngine, createRequestHandler } from '@angular/ssr'
import { APP_BASE_HREF } from '@angular/common'
import bootstrap from 'src/main.server'
// import { node } from '@elysiajs/node'
// import swagger from '@elysiajs/swagger'
const serverDistFolder = dirname(fileURLToPath(import.meta.url))
const browserDistFolder = resolve(serverDistFolder, '../browser')

const indexHtml = join(serverDistFolder, '../browser/index.html')
console.log('indexHtml', indexHtml, browserDistFolder)
const commonEngine = new CommonEngine({
    enablePerformanceProfiler: true,
});

// The Express app is exported so that it can be used by serverless Functions.
function serveapp(): Elysia {
    const app = new Elysia({
        // Elysia defaults to trusting proxy headers, similar to express's 'trust proxy'
        // No explicit setting needed unless specific configuration is required.
        // aot: true,
        // analytic: true,
        // adapter: node()
    })
    // Set global body size limit for built-in parsers (JSON, urlencoded, etc.)
    // server.config.bodyLimit = '3mb'

    // AngularAppEngine constructor doesn't take arguments
    // const angularAppEngine = new AngularAppEngine()



    // const packageJson = existsSync(join(process.cwd(), 'proxy.conf.json')) ?
    //     JSON.parse(readFileSync(join(process.cwd(), 'proxy.conf.json'), 'utf-8')) :
    //     {}
    // console.log('Browser Dist Folder:', indexHtml) // Add this line

    // Apply the swagger plugin
    // server.use(swagger())
    // app.use(cors())

    // // Serve static files from /browser
    app.use(staticPlugin({
        prefix: '',
        assets: browserDistFolder,
        alwaysStatic: true,
        maxAge: 31536000, // 1year
        // indexHTML: false,
        // enableDecodeURI: true,
    }))


    // Integrate SyncAIapis router
    // const airouter = new SyncAIapis()
    // TODO: Adapt airouter.router (likely an Express router) to be compatible with Elysia's server.use()
    // server.use(airouter.router)

    // *PWA Service Worker (if running in production)
    // Use a hook to modify the response headers
    app.onAfterHandle(({ request, set }) => {
        const url = new URL(request.url)
        console.log('url', url)
        if (url.pathname.endsWith('.js') || url.pathname.includes('ngsw.json')) {
            set.headers['Content-Type'] = 'application/javascript'
            set.headers['Service-Worker-Allowed'] = '/'
            console.log(request.headers)
        }
    })

    // Example Elysia Rest API endpoints
    app
        .derive(({ request: { url } }) => {
            const _url = new URL(url)

            return {
                protocol: _url.protocol.split(':')[0],
                originalUrl: _url.pathname + _url.search,
                baseUrl: '',
            }
        })
        .group('/api', (api) => {
            return api
                .get('/example', () => `just an example`)
                .get('/test', async (req: any, res: any) => {
                    try {
                        // const models = await SyncAIapis.getModels()
                        // return res.json(models)
                        return 'Hello from Elysia!'
                    } catch (error) {
                        console.error('Error fetching models:', error)
                        return res.status(500).json({ error: 'Internal Server Error' })
                    }
                })

        })
        .get('*.*', async ({ originalUrl }) => {
            const file = Bun.file(`${browserDistFolder}${originalUrl}`)

            return new Response(Buffer.from(await file.arrayBuffer()), {
                headers: {
                    'Content-Type': file.type,
                },
            })
        })
        .get('*', async ({ originalUrl, baseUrl, protocol, headers }) => {

            let header: HeadersInit | undefined = {}
            console.log('headers', headers)
            if (originalUrl.includes('ngsw')) {
                header = {
                    'Service-Worker-Allowed': '/',
                }
            }
            if (originalUrl.includes('.')) {
                const file = Bun.file(`${browserDistFolder}${originalUrl}`)

                header['Content-Type'] = file.type

                return new Response(Buffer.from(await file.arrayBuffer()), {
                    headers: header,
                })
            }

            // const cacheHit = await db.select(`url:\`${originalUrl}\``)

            // if (cacheHit) {
            //   return new Response(cacheHit.content, {
            //     headers: {
            //       'Content-Type': 'text/html',
            //     },
            //   })
            // }

            try {
                console.log(`${protocol}://${headers['host']}${originalUrl}`)

                const _html = await commonEngine.render({
                    bootstrap,
                    documentFilePath: indexHtml,
                    url: `${protocol}://${headers['host']}${originalUrl}`,
                    publicPath: browserDistFolder,
                    providers: [{ provide: APP_BASE_HREF, useValue: '' }],
                })

                // console.log(_html)

                // await db.create(`url:\`${originalUrl}\``, {
                //     content: _html,
                // })

                return new Response(_html, {
                    headers: {
                        'Content-Type': 'text/html',
                    },
                })
            } catch (error) {
                console.log(error)

                return 'Missing page'
            }
        })

    // All regular routes use the Angular engine **
    // Use angularAppEngine.handle
    // server.all('/*', async ({ request, set }) => {
    //     // Note: Providers like APP_BASE_HREF are typically configured within Angular's bootstrap process,
    //     // not passed directly to the handle method in newer @angular/ssr versions.
    //     // const res = await angularAppEngine.handle(request, { server: 'elysia' })
    //     // return res || undefined
    //     try {
    //         // Use 'server: elysia' hint for potential optimizations
    //         const response = await angularAppEngine.handle(request, { server: 'elysia', indexHtml })
    //         // If Angular doesn't handle it (e.g., API routes planned for Elysia), response might be null/undefined.
    //         if (response) {
    //             // Copy headers and status from Angular's response
    //             response.headers.forEach((value, key) => {
    //                 console.log(`Header: ${key}: ${value}`)
    //                 set.headers[key] = value
    //             })
    //             // set.status = response.status
    //             return response // Return the Response object directly
    //         } else {
    //             // Handle the case where Angular doesn't handle the request
    //             // set.status = 404
    //             return new Response('Not Found', { status: 404 }) // Or your custom 404 page
    //         }
    //     } catch (err) {
    //         console.error('Angular Engine Error:', err)
    //         set.status = 500
    //         return 'Internal Server Error'
    //     }

    // })

    // console.warn('Elysia server started')

    return app
}

// function run(): void {
const host = process.env['HOST'] || 'localhost'
// Start up the Node server
const app = serveapp()
if (isMainModule(import.meta.url)) {
    const port = process.env['PORT'] || 4000

    app.listen({ port, hostname: host }, () => {
        console.log(
            `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
        )
    })
}
// server.on('upgrade', proxyAnthropic.upgrade) // <-- subscribe to http 'upgrade'
// }


// if (process.env['PRODUCTION'] === 'false') {
// run()
// }
export const reqHandler = app.handle // createRequestHandler(serveapp().fetch)
