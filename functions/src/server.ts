/* eslint-disable indent */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
// Initialize Express App and Middleware //
import { SyncAIapis } from "../../api"
import express from "express"
import cors from "cors"
import { join, resolve } from "node:path"
// see here: https://reddit.com/r/reactjs/comments/fsw405/firebase_cloud_functions_cors_policy_error/?rdt=47413
// and: https://github.com/firebase/functions-samples/issues/395#issuecomment-605025572
export const corss = cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"], // Specify allowed methods "OPTIONS"
    allowedHeaders: ["content-type", "Authorization", "Accept", "anthropic-version", "x-with-iframe",
        "x-return-format", "x-target-selector", "x-with-generated-alt", "x-set-cookie"], // Specify allowed headers
    maxAge: 1,
    credentials: true,
})

/* function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE")
    res.setHeader("Access-Control-Allow-Headers", "*")
    res.setHeader("Access-Control-Allow-Credentials", "true")

    next()
} */

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
    // server.use(corsMiddleware)

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
    server.use("/", airouter.router)
    // Example Express Rest API endpoints
    // server.get('/api/**', (req, res) => { });
    // Serve static files from /browser
    server.get("*.*", express.static(browserDistFolder, {
        maxAge: "1y",
        index: "index.html",
    }))

    server.get("*", (req, res) => {
        // const { protocol, originalUrl, baseUrl, headers } = req;

        res.status(404).sendFile(resolve(serverDistFolder, "404.html"))
    });

    /* const s = server.listen(3000, () => {
        console.log("Server is running on port 3000")}
    );

    // This is the important stuff
    s.keepAliveTimeout = (60 * 1000) + 1000;
    s.headersTimeout = (60 * 1000) + 2000; */
    return server;
}

export const app = serveapp()

