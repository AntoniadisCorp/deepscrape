/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
// eslint-disable-next-line object-curly-spacing
import { onRequest } from "firebase-functions/v2/https"
// eslint-disable-next-line object-curly-spacing
import { join } from "node:path"
// import { fileURLToPath } from "node:url";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// })

const s = join(process.cwd(), "dist/deepscrape/server/server.mjs")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const universal = async () => {
    const { app } = await import(s)
    return app
}

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)

export const deepscrape = onRequest(universal)
