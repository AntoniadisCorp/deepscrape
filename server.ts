import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node'
import express, { NextFunction, Request, Response } from 'express'
// import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import chalk from 'chalk'
// import { existsSync, readFileSync } from 'node:fs'
import { SyncAIapis } from 'api'
import { upstashApiLimiter, upstashGeneralLimiter } from 'api/handlers'
import { fileURLToPath } from 'node:url'
import { env } from './src/config/env'
import cookieParser from 'cookie-parser'

type SessionCookiePayload = {
  sessionId?: string
}

// The Express app is exported so that it can be used by serverless Functions.
function serveapp(): express.Application {
  const server: express.Application = express()

  /* 
    Creating a new instance of the `SyncAIapis` class, which is
    likely a custom class for handling API routes in the application. By creating this instance, you
    are initializing the API router and its associated functionality, allowing you to define and
    handle API endpoints within your Express server. 
  */
  const AI: SyncAIapis = new SyncAIapis()

  const serverDistFolderD = dirname(fileURLToPath(import.meta.url))
  const serverDistFolder =  serverDistFolderD // resolve(process.cwd(), 'dist/deepscrape/server')
  const browserDistFolder = resolve(process.cwd(), 'dist/deepscrape/browser')

  const indexHtml = join(serverDistFolder, 'index.server.html')
  // const indexHtmlB = join(browserDistFolder, 'index.html')
  console.log('indexHtml', indexHtml, /* serverDistFolderD */)

  const angularNodeAppEngine = new AngularNodeAppEngine()

  server.set('view engine', 'html')
  server.set('views', browserDistFolder)
  server.set('trust proxy', false) // Enable trust proxy for accurate IP detection in production

  server.use(express.urlencoded({ limit: '3mb', extended: false }))
  server.use(express.json({ limit: '3mb' })) // Parse JSON bodies
  
  // PHASE 1.4: Cookie parser middleware for HttpOnly session cookies
  server.use(cookieParser())

  // PHASE 1.4: HttpOnly cookie session middleware - sets secure session cookie after successful auth
  server.use((req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)
    
    res.json = function(data: SessionCookiePayload) {
      // After successful login/heartbeat, set HttpOnly session cookie
      if (data && (req.path.includes('login') || req.path.includes('heartbeat')) && data.sessionId) {
        const isDevelopment = env.PRODUCTION !== 'true'
        res.cookie('sid', data.sessionId, {
          httpOnly: true,
          secure: !isDevelopment,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
          path: '/'
        })
        console.log('✅ Session cookie set via HttpOnly')
      }
      return originalJson(data)
    }
    next()
  })
  
  // PHASE 1.4: Middleware to clear session cookie on logout
  server.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('sid', {
      httpOnly: true,
      path: '/'
    })
    console.log('✅ Session cookie cleared on logout')
    return res.sendStatus(204)
  })

  // Apply advanced Upstash rate limiter to all requests (except /api which has its own limiter)
  server.use(upstashGeneralLimiter)

  // Use Routers for API with stricter Upstash rate limiting
  server.use('/api', (req: Request, res: Response, next: NextFunction) => {

    console.log(
      chalk.bgYellow('Request Method:'), req.method,
      chalk.bgYellow('Request URL:'), req.url,
      chalk.bgGreen('Status Code:'), req.statusCode,
      chalk.bgYellow('Protocol:'), req.protocol,
      chalk.bgGreen('Original URL:'), req.originalUrl,
      chalk.bgYellow('Base URL:'), req.baseUrl,
      chalk.bgBlue.black('IP:'), req.ip,
      chalk.bgBlue.black('Host:'), req.hostname
    )
    next()
  }, upstashApiLimiter, AI.isJwtAuth, AI.router)

  // *PWA Service Worker (if running in production)
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.includes('ngsw')) {
      res.setHeader('Service-Worker-Allowed', '/')
      console.log(
        chalk.bgYellow('Request Method:'), req.method,
        chalk.bgYellow('Request URL:'), req.url,
        chalk.bgGreen('Status Code:'), req.statusCode,
        chalk.bgYellow('Protocol:'), req.protocol,
        chalk.bgGreen('Original URL:'), req.originalUrl,
        chalk.bgYellow('Base URL:'), req.baseUrl,
        chalk.bgBlue.black('IP:'), req.ip,
        chalk.bgBlue.black('Host:'), req.hostname
      )
    }
    next()
  })

  // Serve static files from /browser
  server.get(/.*\..*/, express.static(browserDistFolder, {
    maxAge: '1y',
    index: "index.html",
  }))

  // All regular routes use the Angular engine **
  server.get(/.*/, (req: Request, res: Response, next: NextFunction) => {
    console.log(
      chalk.bgYellow('Request Method:'), req.method,
      chalk.bgYellow('Request URL:'), req.url,
      chalk.bgGreen('Status Code:'), req.statusCode,
      chalk.bgYellow('Protocol:'), req.protocol,
      chalk.bgGreen('Original URL:'), req.originalUrl,
      chalk.bgYellow('Base URL:'), req.baseUrl,
      chalk.bgBlue.black('IP:'), req.ip,
      chalk.bgBlue.black('Host:'), req.hostname
    )

    angularNodeAppEngine
      .handle(req)
      .then((response) =>
        response ? writeResponseToNodeResponse(response, res) : next()
      )
      .catch(next)
  })

  return server
}


// Start up the Node server
const server = serveapp()

function run(): void {
  const host = env.HOST

  if (isMainModule(import.meta.url)) {
    const port = env.PORT
    server.listen(port, () => {
      console.log(`%s server listening on %s`, chalk.yellow('Node Express'), chalk.green(`http://${host}:${port}`))
      return host
    })
 
  /* The `// }` is a commented out closing curly brace. It seems like it was intended to close a block
  of code or a conditional statement that might have been removed or commented out during
  development. In this case, it appears to be closing the commented out `if` block that checks if
  the current module is the main module. */
  }
}

let reqHandler: express.Application

if (env.PRODUCTION === 'true') {
  run()
} 
console.log(chalk.blue('Environment:'), env.PRODUCTION === 'true' ? chalk.green('Production') : chalk.red('Development'))

reqHandler = createNodeRequestHandler(server)


export { reqHandler }