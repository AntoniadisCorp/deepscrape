/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/*
https://medium.com/@unravel-technologies/angular-loading-performance-deploying-ssr-ssg-to-firebase-2a48d4cc7fc5
*/
import { onRequest } from "firebase-functions/v2/https"
import { app } from "./server"
import * as auth from "./app/auth"

// import path, { join } from "node:path"
// import { fileURLToPath } from "node:url"


// Get the current file's directory fileURLToPath
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)

// Dynamically resolve the server path using a file URL
// const serverFile = `file:///${join(__dirname, "..", "..", "dist", "deepscrape", "server", "server.mjs")}`
// const serverPath = `file://${join(__dirname, "..", "..", "dist", "deepscrape", "server")}`
// console.log(__filename, serverPath, __dirname)
// const absolutePath = path.resolve(serverFile);
// const moduleUrl = `file://${fileURLToPath(`file:///${absolutePath}`)}`
// console.log(moduleUrl)

// Export the Firebase deepscrape SSR app
// https://firebase.google.com/docs/functions/networking
export const deepscrape = onRequest(app)

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)


// Auth Functions
export const createStripeCustomer = auth.createStripeCustomer

export const createPaymentIntent = auth.createPaymentIntent

export const startSubscription = auth.startSubscription

export const updateUsage = auth.updateUsage

// API SECRET KEYS
export const createMyApiKey = auth.createMyApiKey
export const retrieveMyApiKeysPaging = auth.retrieveMyApiKeysPaging

export const getApiKeyDoVisible = auth.getApiKeyDoVisible
