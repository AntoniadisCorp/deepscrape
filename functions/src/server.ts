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
import { ReverseAPIProxy } from "./syncaiapi"
import { existsSync } from "node:fs"
import { limiter } from "./handlers"
import * as dotenv from "dotenv"
import { AuthAPIProxy } from "./authproxy"
dotenv.config({ quiet: true })

// import { existsSync } from "node:fs"
// import { reqHandler } from "../../server"
// see here: https://reddit.com/r/reactjs/comments/fsw405/firebase_cloud_functions_cors_policy_error/?rdt=47413
// and: https://github.com/firebase/functions-samples/issues/395#issuecomment-605025572
export const corss = cors({
    origin: process.env.PRODUCTION === "true"? [
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
    const airouter = new ReverseAPIProxy()
    const oauthproxy = new AuthAPIProxy()


    // The code snippet you provided is setting up different folder paths
    // for the Express server to serve static files from
    const distFolder = resolve(process.cwd(), "..", "dist")
    const publicDistFolder = resolve(process.cwd(), "lib/public")
    const serverDistFolder = join(distFolder, "deepscrape", "server")
    const browserDistFolder = join(distFolder, "deepscrape", "browser")

    // console.log(serverDistFolder, distFolder, `Browser Dist Folder: ${browserDistFolder}`)
    // Check if the serverDistFolder exists, if not, use the browserDistFolder
    const indexHtml = existsSync(join(serverDistFolder, "index.server.html"))? "index.server.html" : "index"

    server.set("view engine", "html")
    server.set("views", browserDistFolder)
    server.set("trust proxy", false)

    // Security and logging middleware
    server.use(helmet());
    server.use(morgan("combined"))
    server.use(corss);

    server.use(express.urlencoded({ limit: "3mb", extended: false }));
    server.use(express.json({ limit: "3mb" })) // To pars

    // *PWA Service Worker (if running in production)
    server.use((req, res, next) => {
        if (req.url.includes("ngsw")) {
            res.setHeader("Service-Worker-Allowed", "/")
        }
        next()
    })
    // Register the API routes , airouter.isJwtAuth,
    server.use("/api", limiter, airouter.isJwtAuth, airouter.router)
    server.use("/oauth", limiter, oauthproxy.router)
    server.use("/", limiter)

    // Serve static files from /browser
    server.get("*.*", express.static(serverDistFolder, {
        maxAge: "1y",
        index: indexHtml,
    }))


    server.get("*", (req: express.Request, res, next: NextFunction) => {
        const { protocol, originalUrl, baseUrl, headers } = req
        console.log(`Request URL: ${protocol}://${headers.host}${baseUrl}${originalUrl}`)
        // res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] })
        res.status(404).sendFile(resolve(publicDistFolder, "404.html"))
    })


    // This is the important stuff
    // s.keepAliveTimeout = (60 * 1000) + 1000;
    // s.headersTimeout = (60 * 1000) + 2000;

    return server;
}

// const app = (req: express.Request, res: express.Response) => {
//   // Create the request handler

//   // Handle the request
//   reqHandler(req, res)
// }

const app = serveapp()
// Export the Firebase HTTPS function for SSR
export const deepscrape = onRequest(app);
