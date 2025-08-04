/* eslint-disable indent */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
// Initialize Express App and Middleware //

import express from "express"
import cors from "cors"
import { join, resolve } from "node:path"
import { onRequest } from "firebase-functions/https"
import { SyncAIapis } from "./syncaipai"
import { limiter } from "./handlers"
// see here: https://reddit.com/r/reactjs/comments/fsw405/firebase_cloud_functions_cors_policy_error/?rdt=47413
// and: https://github.com/firebase/functions-samples/issues/395#issuecomment-605025572
export const corss = cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], // Specify allowed methods "OPTIONS"
    allowedHeaders: ["content-type", "Authorization", "Accept", "anthropic-version", "x-with-iframe",
        "x-return-format", "x-target-selector", "x-with-generated-alt", "x-set-cookie", "x-api-key"], // Specify allowed headers
    maxAge: 1,
    credentials: true,
})

/* eslint-disable semi */
function serveapp(): express.Application {
    const server: express.Application = express()


    const serverDistFolder = resolve(process.cwd(), "lib/public");
    // console.log(browserDistFolder, process.cwd())
    const browserDistFolder = join(serverDistFolder, "dist", "deepscrape", "browser")

    server.set("view engine", "html");
    server.set("views", browserDistFolder);
    // server.set("trust proxy", true)

    server.use(corss);

    server.use(express.urlencoded({ limit: "3mb", extended: false }));
    server.use(express.json({ limit: "3mb" })) // To pars

    const airouter = new SyncAIapis()

    // *PWA Service Worker (if running in production)
    server.use((req, res, next) => {
        if (req.url.includes("ngsw")) {
            res.setHeader("Service-Worker-Allowed", "/")
        }
        next()
    })
    server.use("/api", airouter.isJwtAuth, airouter.router)
    server.use(limiter)

    // Serve static files from /browser
    server.get("*.*", express.static(browserDistFolder, {
        maxAge: "1y",
        index: "index.html",
    }))

    server.get("*", (_, res) => {
        // const { protocol, originalUrl, baseUrl, headers } = req;

        res.status(404).sendFile(resolve(serverDistFolder, "404.html"))
    });

    // This is the important stuff
    // s.keepAliveTimeout = (60 * 1000) + 1000;
    // s.headersTimeout = (60 * 1000) + 2000;

    return server;
}

const app = serveapp()

export const deepscrape = onRequest(app)
