/* eslint-disable indent */
/* eslint-disable max-len */
/* eslint-disable valid-jsdoc */
/* eslint-disable linebreak-style */
// import {geoDBManager} from "./analytics"
import {initializeGeoDatabase} from "./analytics"
import {env} from "../config/env"
const port = env.PORT || 4000
/**
 * Soft Decryption Algorithm: Reverses the soft encryption process.
 * @param input - The transformed string to decrypt.
 * @return The original string.
 */
export function customUrlDecoder(input: string): string {
    // Step 1: Base64 decode the string
    const decoded = Buffer.from(input, "base64").toString("utf-8")

    // Step 2: Reverse the string back to the shifted format
    const reversedBack = decoded.split("").reverse().join("")

    // Step 3: Shift characters' ASCII values back to their original form (e.g., -3)
    const original = reversedBack.split("")
        .map((char) => String.fromCharCode(char.charCodeAt(0) - 3))
        .join("")

    return original
}


/**
 * Event listener for HTTP server "listening" event.
 */
export async function onListening() {
    try {
        await initializeGeoDatabase()
        console.log("IP2Location database initialized successfully.")
    } catch (error) {
        console.error("Error initializing IP2Location database:!", error)
    }
    // debug('Listening on ' + bind);
}

/**
 * Normalize a port into a number, string, or false.
 */
export function normalizePort(servPort: string) {
    const port = parseInt(servPort, 10)

    if (isNaN(port)) return servPort // named pipe

    if (port < 0) return false
    else return port // port number
}

/**
 * Event listener for HTTP server "error" event.
 * @param {any} error
 * @returns {void}
 */
export function onError(error: any): void {
    if (error.syscall !== "listen") {
        throw error
    }

    const bind = typeof port === "string" ?
        "Pipe " + port :
        "Port " + port

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges")
            process.exit(1)
            break
        case "EADDRINUSE":
            console.error(bind + " is already in use")
            process.exit(1)
            break
        default:
            throw error
    }
}
