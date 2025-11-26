/* eslint-disable indent */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
// Initialize Express App and Middleware //
import express, { NextFunction, Response, Request, json } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { join, resolve } from "node:path"
import { onRequest } from "firebase-functions/https"
import { limiter, statusCheck } from "./handlers"
import * as dotenv from "dotenv"
import { AuthAPIProxy, EventsAPIProxy, ReverseAPIProxy } from "./infrastructure"
import cookieParser from "cookie-parser"
import { geoDBManager, guestTracker, IP2LocationManager, onError, onListening } from "./gfunctions"
import { existsSync } from "node:fs"
import crypto from "node:crypto"

// import { createNodeRequestHandler } from "@angular/ssr/node"
dotenv.config({ quiet: true })
// import { existsSync } from "node:fs"
// import { reqHandler } from "../../server"
// see here: https://reddit.com/r/reactjs/comments/fsw405/firebase_cloud_functions_cors_policy_error/?rdt=47413
// and: https://github.com/firebase/functions-samples/issues/395#issuecomment-605025572
export const corss = cors({
  origin: process.env["PRODUCTION"] === "true" ? [
    "https://deepscrape.dev", "https://deepscrape.web.app"] : ["http://127.0.0.1:5000", "http://localhost:4200", "http://127.0.0.1:4200", "http://127.0.0.1:8081"], // Allow all origins or specify your frontend URL
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
  const eventsProxy = new EventsAPIProxy()
  const oauthProxy = new AuthAPIProxy()
  // const uploadProxy = new UploadAPIProxy()

  // Here, we now use the `AngularNodeAppEngine` instead of the `CommonEngine`
  // const commonEngine = new CommonEngine()

  // The code snippet you provided is setting up different folder paths
  // for the Express server to serve static files from
  const distFolder = resolve(process.cwd(), "..", "dist")
  const publicDistFolder = resolve(process.cwd(), "lib/public")
  // const serverDistFolder = join(distFolder, "deepscrape", "server")
  const browserDistFolder = join(distFolder, "deepscrape", "browser")
  const indexHtml = existsSync(join(publicDistFolder, "index.server.html")) ? "index.server.html" : "index"
  // console.log(serverDistFolder, distFolder, `Browser Dist Folder: ${browserDistFolder}`)
  // Check if the serverDistFolder exists, if not, use the browserDistFolder

  // const browserIndexHtml = existsSync(join(browserDistFolder, "index.html"))? "index.html" : "index"
  /* const { APP_BASE_HREF } = await import("@angular/common")
  const { ngExpressEngine } = await import("@nguniversal/express-engine")
  const { AppServerModule } = await import(join(resolve(process.cwd(), "..", "server"), "main.server.mjs"))
  server.engine("html", ngExpressEngine({
      bootstrap: AppServerModule,
  })) */
  server.set("view engine", "html")
  server.set("views", browserDistFolder)
  server.set("trust proxy", process.env.PRODUCTION === "true")

  // Security and logging middleware
  server.use(helmet({
    contentSecurityPolicy: false, // We'll set CSP manually for nonce support
  }))

  server.use(morgan("combined"))
  server.use(corss)
  server.use(cookieParser())

  // Optimized security headers middleware
  server.use((req, res, next) => {
    // Generate a nonce for each request
    const nonce = crypto.randomBytes(16).toString("base64")
    // Set all recommended security headers
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "DENY")
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
    res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()")
    // Set CSP header with nonce for style-src and script-src
    res.setHeader("Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://apis.google.com; style-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com https://fonts.googleapis.com; connect-src 'self' https://firebase.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com https://us-central1-libnet-d76db.cloudfunctions.net https://region1-google-analytics.com https://cdnjs.cloudflare.com https://deepscrape.dev https://fonts.gstatic.com https://www.googletagmanager.com https://apis.google.com https://ui-avatars.com https://firebasestorage.googleapis.com https://firebaseinstallations.googleapis.com; img-src 'self' data: https: https://ui-avatars.com https://firebasestorage.googleapis.com https://www.googletagmanager.com https://www.gstatic.com https://www.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com https://fonts.googleapis.com; object-src 'none'; base-uri 'self'; frame-src 'self' https://libnet-d76db.firebaseapp.com;`
    )
    // Make nonce available for downstream rendering
    res.locals.nonce = nonce
    next()
  })

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

  server.use("/event", json({ limit: "1mb" }),
    limiter, eventsProxy.router)

  // Register the API routes (with authentication)
  server.use("/api",
    express.urlencoded({ limit: "3mb", extended: false }),
    express.json({ limit: "3mb" }),
    process.env.PRODUCTION === "true" ? limiter : (req: Request, res: Response, next: NextFunction) => next(),
    aiProxy.isJwtAuth, aiProxy.router)

  // server.use("/upload", uploadProxy.router)

  server.use("/oauth",
    express.urlencoded({ limit: "3mb", extended: false }),
    express.json({ limit: "3mb" }),
    limiter, oauthProxy.router)

  // Serve static files from /browser
  server.get("*.*", express.static(browserDistFolder, {
    maxAge: "1y",
    index: "index.html",
  }))
  // All regular routes use the Angular engine **
  server.get("*", limiter, (req: express.Request, res: Response) => {
    const { protocol, originalUrl, baseUrl, headers } = req
    console.log(`Request URL: ${protocol}://${headers.host}${baseUrl}${originalUrl}`)

    if (indexHtml) {
      console.log(`Serving from: ${publicDistFolder}`)
      res.sendFile(resolve(publicDistFolder, "index.server.html"))
    } else {
      res.status(404).sendFile(resolve(publicDistFolder, "404.html"))
    }
  })

  // Set up graceful shutdown
  setupGracefulShutdown(server, geoDBManager)

  return server
}

// Graceful shutdown handler
function setupGracefulShutdown(server: express.Application, geoDBManager: IP2LocationManager) {
  // Event Listeners
  server.on("error", onError)
  // server.on("listening", onListening)
  onListening()

  // Graceful Shutdown Function
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
