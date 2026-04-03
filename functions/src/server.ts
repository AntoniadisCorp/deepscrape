/* eslint-disable indent */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
// Initialize Express App and Middleware //
import express, { NextFunction, Response, Request } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { join, resolve } from "node:path"
import { onRequest } from "firebase-functions/https"
import { upstashEventLimiter, upstashFunctionLimiter, statusCheck } from "./handlers"
// import * as dotenvx from "@dotenvx/dotenvx"
import { AuthAPIProxy, EventsAPIProxy, ReverseAPIProxy } from "./infrastructure"
import cookieParser from "cookie-parser"
import csurf from "csurf"
import { geoDBManager, guestTracker, IP2LocationManager, onListening } from "./gfunctions"
import { existsSync } from "node:fs"
import crypto from "node:crypto"
import { env, functionsEnvJson, helmetConfig } from "./config"
import { serviceAccountKeyParam } from "./app/config"

// import { createNodeRequestHandler } from "@angular/ssr/node"
// dotenvx.config({quiet: true, debug: true, verbose: true})

// import { existsSync } from "node:fs"
// import { reqHandler } from "../../server"
// see here: https://reddit.com/r/reactjs/comments/fsw405/firebase_cloud_functions_cors_policy_error/?rdt=47413
// and: https://github.com/firebase/functions-samples/issues/395#issuecomment-605025572
const allowedOrigins = env.IS_PRODUCTION ?
  ["https://deepscrape.dev", "https://deepscrape.web.app"] :
  [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://127.0.0.1:8081",
  ]

export const corss = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    callback(null, allowedOrigins.includes(origin))
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  allowedHeaders: ["content-type", "Authorization", "Accept", "anthropic-version", "x-with-iframe",
    "x-return-format", "x-target-selector", "x-with-generated-alt", "x-set-cookie", "x-api-key",
    "csrf-token", "x-csrf-token"],
  maxAge: 86400,
  credentials: true,
})

const CSRF_IGNORED_PATH_PREFIXES = ["/event", "/status", "/oauth"]

function shouldBypassCsrf(req: Request): boolean {
  return CSRF_IGNORED_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))
}

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
  const browserDistFolder = join(distFolder, "deepscrape", "browser")
  const serverIndexPath = resolve(publicDistFolder, "index.server.html")
  const browserIndexPath = resolve(browserDistFolder, "index.html")
  const hasServerIndex = existsSync(serverIndexPath)
  const hasBrowserIndex = existsSync(browserIndexPath)
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
  server.set("trust proxy", env.TRUST_PROXY)

  // Generate CSP nonce before Helmet so per-request directives can use it.
  server.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64")
    next()
  })

  // Security Configuration and logging middleware
  server.use(helmet(helmetConfig))
  server.use(morgan("combined"))
  server.use(corss)

  // CSRF Protection Middleware Configuration
  const cookieSecret = env.COOKIE_SECRET || env.CSRF_COOKIE_SECRET
  if (env.IS_PRODUCTION && !cookieSecret) {
    throw new Error("COOKIE_SECRET (or CSRF_COOKIE_SECRET) is required in production")
  }
  server.use(cookieParser(cookieSecret))
  const csrfProtection = csurf({
    cookie: {
      key: "_csrf_secret",
      httpOnly: true,
      sameSite: "lax",
      secure: env.IS_PRODUCTION,
      path: "/",
      signed: !!cookieSecret,
    },
    ignoreMethods: ["GET", "HEAD", "OPTIONS"],
    value: (req) => {
      return (req.headers["csrf-token"] as string) ||
        (req.headers["x-csrf-token"] as string) ||
        req.body?._csrf ||
        req.query?._csrf as string;
    },
  }) as unknown as express.RequestHandler

  // Apply CSRF protection for browser-facing and API routes. Machine/webhook/health
  // endpoints are excluded because they are non-browser callers.
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (shouldBypassCsrf(req)) {
      return next()
    }
    return csrfProtection(req, res, next)
  })

  // Issue Angular-readable CSRF token cookie after csurf middleware attaches req.csrfToken().
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (shouldBypassCsrf(req)) {
      return next()
    }

    const tokenFactory = (req as Request & { csrfToken?: () => string }).csrfToken
    if (typeof tokenFactory === "function") {
      const token = tokenFactory()
      res.cookie("_csrf", token, {
        httpOnly: false,
        sameSite: "lax",
        secure: env.IS_PRODUCTION,
        path: "/",
      })
    }

    return next()
  })

  server.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    if ((error as {code?: string})?.code !== "EBADCSRFTOKEN") {
      return next(error)
    }

    const csrfDebug = {
      method: req.method,
      path: req.path,
      host: req.headers.host || "",
      origin: req.headers.origin || "",
      referer: req.headers.referer || "",
      hasCsrfHeader: !!(req.headers["csrf-token"] || req.headers["x-csrf-token"]),
      hasCsrfCookie: typeof req.cookies?._csrf === "string" && req.cookies._csrf.length > 0,
      hasCsrfSecretCookie: typeof req.cookies?._csrf_secret === "string" && req.cookies._csrf_secret.length > 0,
      hasSignedCsrfSecretCookie: typeof (req as Request & { signedCookies?: Record<string, unknown> }).signedCookies?._csrf_secret === "string",
    }

    if (env.IS_EMULATOR) {
      console.warn("CSRF validation failed", csrfDebug)
    }

    if (req.path.startsWith("/api")) {
      if (env.IS_EMULATOR) {
        return res.status(403).json({ error: "Invalid CSRF token", debug: csrfDebug })
      }

      return res.status(403).json({ error: "Invalid CSRF token" })
    }

    return res.status(403).send("Invalid CSRF token")
  })
// Set all recommended security headers
    // res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
    // res.setHeader("X-Content-Type-Options", "nosniff")
    // res.setHeader("X-Frame-Options", "DENY")
    // res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
    // res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()")
    // // Set CSP header with nonce for style-src and script-src
    // res.setHeader("Content-Security-Policy",
    //   `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://apis.google.com; style-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com https://fonts.googleapis.com; connect-src 'self' https://firebase.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com https://us-central1-libnet-d76db.cloudfunctions.net https://region1.google-analytics.com https://cdnjs.cloudflare.com https://deepscrape.dev https://fonts.gstatic.com https://www.googletagmanager.com https://apis.google.com https://ui-avatars.com https://firebasestorage.googleapis.com https://firebaseinstallations.googleapis.com; img-src 'self' data: https: https://ui-avatars.com https://firebasestorage.googleapis.com https://www.googletagmanager.com https://www.gstatic.com https://www.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com https://fonts.googleapis.com; object-src 'none'; base-uri 'self'; frame-src 'self' https://libnet-d76db.firebaseapp.com;`
    // )
    // Make nonce available for downstream rendering

  // *PWA Service Worker (if running in production)
  server.use((req, res, next,) => {
    if (req.url.includes("ngsw")) {
      res.setHeader("Service-Worker-Allowed", "/")
    }
    next()
  })

  // Optional SPA endpoint for proactive CSRF token refresh.
  server.get("/csrf-token", (req: Request, res: Response) => {
    const tokenFactory = (req as Request & { csrfToken?: () => string }).csrfToken
    if (typeof tokenFactory !== "function") {
      return res.status(500).json({ error: "CSRF middleware unavailable" })
    }

    const token = tokenFactory()
    res.cookie("_csrf", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: env.IS_PRODUCTION,
      path: "/",
    })
    res.setHeader("Cache-Control", "no-store")
    return res.status(200).json({ csrfToken: token })
  })

  // Track anonymous guests as early as possible so API and event routes are included.
  server.use(guestTracker)

  // Public API status route (no authentication)
  server.get("/status",
    express.urlencoded({ limit: "3mb", extended: false }),
    express.json({ limit: "3mb" }),
    upstashFunctionLimiter, statusCheck) // aiProxy.router now contains the /status route

  // Cloud Functions runtime already parses request bodies.
  // Re-parsing with express.json() can throw "stream is not readable" in production.
  server.use("/event",
    upstashEventLimiter, eventsProxy.router)

  // Register the API routes (with authentication)
  server.use("/api",
    express.urlencoded({ limit: "3mb", extended: false }),
    express.json({ limit: "3mb" }),
    env.IS_PRODUCTION ? upstashFunctionLimiter : (req: Request, res: Response, next: NextFunction) => next(),
    aiProxy.isJwtAuth,
    aiProxy.router
  )

  // server.use("/upload", uploadProxy.router)
  // OAuth routes (e.g. Google Sign-In) - no JWT auth, but still rate limited
  server.use("/oauth",
    express.urlencoded({ limit: "3mb", extended: false }),
    express.json({ limit: "3mb" }),
    upstashFunctionLimiter,
    oauthProxy.router
  )

  // Serve static files from /browser
  server.get("*.*", express.static(browserDistFolder, {
    maxAge: env.IS_PRODUCTION ? "1y" : 0,
    etag: true,
    index: "index.html",
  }))


  // All regular routes use the Angular engine **
  server.get("*", upstashFunctionLimiter, (req: express.Request, res: Response) => {
    const { protocol, originalUrl, baseUrl, headers } = req
    console.log(`Request URL: ${protocol}://${headers.host}${baseUrl}${originalUrl}`)

    if (hasServerIndex) {
      console.log(`Serving SSR index from: ${serverIndexPath}`)
      return res.sendFile(serverIndexPath)
    }

    if (hasBrowserIndex) {
      console.log(`Serving browser index fallback from: ${browserIndexPath}`)
      return res.sendFile(browserIndexPath)
    }

    return res.status(404).sendFile(resolve(publicDistFolder, "404.html"))
  })

  // Set up graceful shutdown
  setupGracefulShutdown(geoDBManager)

  return server
}

// Graceful shutdown handler
function setupGracefulShutdown(geoDBManager: IP2LocationManager) {
  if (process.listenerCount("SIGINT") > 0 || process.listenerCount("SIGTERM") > 0) {
    return
  }

  // Initialization hook
  onListening()

  // Graceful Shutdown Function
  const shutdown = async () => {
    console.log("Shutting down gracefully...")

    // Close the database
    geoDBManager.close()

    console.log("Shutdown complete")
    process.exit(0)
  }

  // Handle SIGINT (Ctrl+C) and SIGTERM
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error)
    geoDBManager.close()
    process.exit(1)
  })

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason)
    geoDBManager.close()
    process.exit(1)
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
export const deepscrape = onRequest(
  {
    minInstances: 1,
    memory: "512MiB",
    secrets: [functionsEnvJson, serviceAccountKeyParam],
  },
  serveapp()
)
