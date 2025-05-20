// import { APP_BASE_HREF } from '@angular/common'
import { AngularNodeAppEngine, CommonEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node'
import express, { NextFunction, Request, Response } from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
// import { existsSync, readFileSync } from 'node:fs'
import { SyncAIapis } from 'api'
import { limiter } from 'api/handlers'
// import bootstrap from 'src/main.server'

// The Express app is exported so that it can be used by serverless Functions.
function serveapp(): express.Application {
  const server: express.Application = express()

  // 
  /* 
    Creating a new instance of the `SyncAIapis` class, which is
    likely a custom class for handling API routes in the application. By creating this instance, you
    are initializing the API router and its associated functionality, allowing you to define and
    handle API endpoints within your Express server. 
  */
  const AI: SyncAIapis = new SyncAIapis()

  const serverDistFolder = dirname(fileURLToPath(import.meta.url))
  const browserDistFolder = resolve(serverDistFolder, '../browser')
  // const indexHtml = resolve(serverDistFolder, 'index.server.html')
  const indexHtml = join(serverDistFolder, 'index.server.html')
  // console.log('indexHtml', indexHtml, browserDistFolder)

  // Here, we now use the `AngularNodeAppEngine` instead of the `CommonEngine`
  const angularNodeAppEngine = new AngularNodeAppEngine()
  // const commonEngine = new CommonEngine()

  server.set('view engine', 'html')
  server.set('views', browserDistFolder)
  server.set('trust proxy', true)

  server.use(express.urlencoded({ limit: '3mb', extended: false }))
  server.use(express.json({ limit: '3mb' })) // To pars

  // Use Routers for API
  server.use('/api', AI.isJwtAuth, AI.router)
  server.use(limiter)

  // *PWA Service Worker (if running in production)
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.includes('ngsw')) {
      res.setHeader('Service-Worker-Allowed', '/')
    }
    console.log('request', req.url, req.statusCode, req.protocol, req.originalUrl, req.baseUrl)
    next()
  })

  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }))

  // All regular routes use the Angular engine **
  server.get('**', (req: Request, res: Response, next: any) => {
    const { protocol, originalUrl, baseUrl, headers } = req
    // Yes, this is executed in devMode via the Vite DevServer
    console.log('request', req.url, res.statusCode, protocol, originalUrl, baseUrl)
    // commonEngine
    //   .render({
    //     bootstrap,
    //     documentFilePath: indexHtml,
    //     url: `${protocol}://${headers.host}${originalUrl}`,
    //     publicPath: browserDistFolder,
    //     providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    //   })
    //   .then((html) => res.send(html))
    //   .catch((err) => next(err))
    angularNodeAppEngine
      .handle(req, { server: 'express' })
      .then((response) =>
        response ? writeResponseToNodeResponse(response, res) : next()
      )
      .catch(next)
  })

  return server
}


function run(): void {
  const host = process.env['HOST'] || 'localhost'
  // Start up the Node server
  const server = serveapp()
  if (isMainModule(import.meta.url)) {
    const port = process.env['PORT'] || 4000
    console.log(`Running on http://${host}:${process.env['PORT']}`)
    server.listen(port, () => {
      console.log(`Node Express server listening on http://${host}:${port}`)
      return host
    })
  }
}

let reqHandler = null

if (process.env['PRODUCTION'] === 'true') {
  run()
} else {
  reqHandler = createNodeRequestHandler(serveapp())
}

export { reqHandler }