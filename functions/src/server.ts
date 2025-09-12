/* eslint-disable indent */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
// Initialize Express App and Middleware //
import express, { NextFunction } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"

import { join, resolve } from "node:path"
import { onRequest } from "firebase-functions/https"
// import { existsSync } from "node:fs"
import { limiter, statusCheck } from "./handlers"
import * as dotenv from "dotenv"
import { AuthAPIProxy, ReverseAPIProxy, UploadAPIProxy} from "./infrastructure"
// import { geoDBManager, guestTracker, IP2LocationManager } from "./gfunctions"
import cookieParser from "cookie-parser"
import { geoDBManager, guestTracker, IP2LocationManager, onError, onListening } from "./gfunctions"
// import { createNodeRequestHandler } from "@angular/ssr/node"
dotenv.config({ quiet: true })
// import { existsSync } from "node:fs"
// import { reqHandler } from "../../server"
// see here: https://reddit.com/r/reactjs/comments/fsw405/firebase_cloud_functions_cors_policy_error/?rdt=47413
// and: https://github.com/firebase/functions-samples/issues/395#issuecomment-605025572
export const corss = cors({
    origin: process.env["PRODUCTION"] === "true"? [
        "https://deepscrape.dev", "https://deepscrape.web.app",
        "http://127.0.0.1:5000", "http://localhost:4200", "http://127.0.0.1:4200", "http://127.0.0.1:8081"] : "*", // Allow all origins or specify your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], // Specify allowed methods "OPTIONS"
    allowedHeaders: ["content-type", "Authorization", "Accept", "anthropic-version", "x-with-iframe",
        "x-return-format", "x-target-selector", "x-with-generated-alt", "x-set-cookie", "x-api-key"], // Specify allowed headers
    maxAge: 1,
    credentials: true,
})

/* eslint-disable semi */
  function serveapp() {
    // Create an instance of the Express application
    const server: express.Application = express()
    const aiProxy = new ReverseAPIProxy()
    const oauthProxy = new AuthAPIProxy()
    const uploadProxy = new UploadAPIProxy()

    // Here, we now use the `AngularNodeAppEngine` instead of the `CommonEngine`
    // const commonEngine = new CommonEngine()


    // The code snippet you provided is setting up different folder paths
    // for the Express server to serve static files from
    const distFolder = resolve(process.cwd(), "..", "dist")
    const publicDistFolder = resolve(process.cwd(), "lib/public")
    // const serverDistFolder = join(distFolder, "deepscrape", "server")
    const browserDistFolder = join(distFolder, "deepscrape", "browser")

    // console.log(serverDistFolder, distFolder, `Browser Dist Folder: ${browserDistFolder}`)
    // Check if the serverDistFolder exists, if not, use the browserDistFolder
    // const indexHtml = existsSync(join(serverDistFolder, "index.server.html"))? "index.server.html" : "index"
    // const browserIndexHtml = existsSync(join(browserDistFolder, "index.html"))? "index.html" : "index"
    /* const { APP_BASE_HREF } = await import("@angular/common")
    const { ngExpressEngine } = await import("@nguniversal/express-engine")
    const { AppServerModule } = await import(join(resolve(process.cwd(), "..", "server"), "main.server.mjs"))
    server.engine("html", ngExpressEngine({
        bootstrap: AppServerModule,
    })) */
    server.set("view engine", "html")
    server.set("views", browserDistFolder)
    server.set("trust proxy", true)

    // Security and logging middleware
    server.use(helmet())
    server.use(morgan("combined"))
    server.use(corss)
    server.use(cookieParser())

    server.use(guestTracker) // Custom middleware to track guest users

    // *PWA Service Worker (if running in production)
    server.use((req, res, next,) => {
        if (req.url.includes("ngsw")) {
            res.setHeader("Service-Worker-Allowed", "/")
        }
        next()
    })
    // Public API status route (no authentication)
    server.get("/status",
        express.urlencoded({ limit: "3mb", extended: false }),
        express.json({ limit: "3mb" }),
        limiter, statusCheck) // aiProxy.router now contains the /status route

    // Register the API routes (with authentication)
    server.use("/api",
        express.urlencoded({ limit: "3mb", extended: false }),
        express.json({ limit: "3mb" }),
        limiter, aiProxy.isJwtAuth, aiProxy.router)

    server.use("/upload", uploadProxy.router)

    server.use("/oauth",
        express.urlencoded({ limit: "3mb", extended: false }),
        express.json({ limit: "3mb" }),
        limiter, oauthProxy.router)
    // server.use("/", limiter)

    // Serve static files from /browser
    server.get("*.*", express.static(browserDistFolder, {
        maxAge: "1y",
        index: "index.html",
    }))
    // All regular routes use the Angular engine **
    server.get("*", limiter, (req: express.Request, res, next: NextFunction) => {
        const { protocol, originalUrl, baseUrl, headers } = req
        console.log(`Request URL: ${protocol}://${headers.host}${baseUrl}${originalUrl}`)
        // res.sendFile(join(serverDistFolder, "index.server.html"))

        res.sendFile(resolve(publicDistFolder, "404.html"))

        // console.log(
        //   chalk.bgYellow('Request Method:'), req.method,
        //   chalk.bgYellow('Request URL:'), req.url,
        //   chalk.bgGreen('Status Code:'), req.statusCode,
        //   chalk.bgYellow('Protocol:'), req.protocol,
        //   chalk.bgGreen('Original URL:'), req.originalUrl,
        //   chalk.bgYellow('Base URL:'), req.baseUrl,
        //   chalk.bgBlue.black('IP:'), req.ip,
        //   chalk.bgBlue.black('Host:'), req.hostname
        // )

        // commonEngine
        // .render({
        //   bootstrap,
        //   documentFilePath: indexHtml,
        //   url: `${protocol}://${headers.host}${originalUrl}`,
        //   publicPath: browserDistFolder,
        //   providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
        // })
        // .then((html) => res.send(html))
        // .catch((err) => next(err))

        /* angularNodeAppEngine
        .handle(req, { server: "express" })
        .then((response) =>
          response ? writeResponseToNodeResponse(response, res) : next()
        )
        .catch(next) */
    })

    // Set up graceful shutdown
    setupGracefulShutdown(server, geoDBManager)

    // This is the important stuff
    // s.keepAliveTimeout = (60 * 1000) + 1000
    // s.headersTimeout = (60 * 1000) + 2000

    return server
}

// Graceful shutdown handler
function setupGracefulShutdown(server: express.Application, geoDBManager: IP2LocationManager) {
  // Event Listeners
  server.on("error", onError)
  // server.on("listening", onListening)
  onListening()


  const shutdown = async () => {
    console.log("Shutting down gracefully...")

    // Close the database
    geoDBManager.close()

    // Stop accepting new connections
    server.on("close", (err) => {
      if (err) {
        console.error("Error closing HTTP server:", err)
        process.exit(1)
      }
      console.log("HTTP server closed")

      process.exit(0)
    })
  }

   // Handle SIGINT (Ctrl+C) and SIGTERM
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error)
    server.on("close", () => {
      geoDBManager.close()
      process.exit(1)
    })
  })

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason)
    server.on("close", () => { // error - listening - connection - request
      geoDBManager.close()
      process.exit(1)
    })
  })
}

// const app = (req: express.Request, res: express.Response) => {
//   // Create the request handler

//   // Handle the request
//   reqHandler(req, res)
// }

/* const app = async (req: express.Request, res: express.Response) => {
    const serve = await serveapp();
    const handler = createNodeRequestHandler(serve)
    return handler(req, res)
}; */
// Export the Firebase HTTPS function for SSR
export const deepscrape = onRequest(serveapp())
