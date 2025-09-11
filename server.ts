// import { APP_BASE_HREF } from '@angular/common'
import { AngularNodeAppEngine, CommonEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node'
import express, { NextFunction, Request, Response } from 'express'
// import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import chalk from 'chalk'
// import { existsSync, readFileSync } from 'node:fs'
import { SyncAIapis } from 'api'
import { apiLimiter, limiter } from 'api/handlers'

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

  // const serverDistFolderD = dirname(fileURLToPath(import.meta.url))
  const serverDistFolder =  resolve(process.cwd(), 'dist/deepscrape/server') // serverDistFolderD //
  const browserDistFolder = resolve(process.cwd(), 'dist/deepscrape/browser')

  const indexHtml = join(serverDistFolder, 'index.server.html')
  // const indexHtmlB = join(browserDistFolder, 'index.html')
  console.log('indexHtml', indexHtml, /* serverDistFolderD */)

  // Here, we now use the `AngularNodeAppEngine` instead of the `CommonEngine`
  const angularNodeAppEngine = new AngularNodeAppEngine()
  // const commonEngine = new CommonEngine()

  server.set('view engine', 'html')
  server.set('views', browserDistFolder)
  server.set('trust proxy', false)

  server.use(express.urlencoded({ limit: '3mb', extended: false }))
  server.use(express.json({ limit: '3mb' })) // To pars

  // Use Routers for API
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
  }, apiLimiter, AI.isJwtAuth, AI.router)
  server.use(limiter)

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
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y',
    index: "index.html",
  }))

  // All regular routes use the Angular engine **
  server.get('**', (req: Request, res: Response, next: any) => {
    // const { protocol, originalUrl, baseUrl, headers } = req
    // res.render(indexHtmlB, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] })
    // Yes, this is executed in devMode via the Vite DevServer
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
     
    // commonEngine
    //   .render({
    //     bootstrap,
    //     documentFilePath: indexHtml,
    //     url: `${protocol}://${headers.host}${originalUrl}`,
    //     publicPath: browserDistFolder,
    //     providers: [{provide: APP_BASE_HREF, useValue: baseUrl}],
    //   })
    //   .then((html) => res.send(html))
    //   .catch((err) => next(err));
    angularNodeAppEngine
      .handle(req, { server: 'express' })
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
  const host = process.env['HOST'] || 'localhost'

  if (isMainModule(import.meta.url)) {
    const port = process.env['PORT'] || 4000
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

if (process.env['PRODUCTION'] === 'false') {
  run()
} 
console.log(chalk.blue('Environment:'), process.env['PRODUCTION'] === 'true' ? chalk.green('Production') : chalk.red('Development'))

reqHandler = createNodeRequestHandler(server)


export { reqHandler }