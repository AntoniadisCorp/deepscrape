/* eslint-disable space-before-function-paren */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable indent */
/* eslint-disable require-jsdoc */
const fs = require("fs-extra")

// const sourceDir = "../dist/deepscrape/server"
// const destinationDir = "./server"

// async function copyFiles() {
//     try {
//         // Ensure the destination directory exists
//         await fs.ensureDir(destinationDir)

//         // Ensure the destination directory exists and clean it
//         await fs.emptyDir(destinationDir)
//         console.log("Destination directory cleaned.")

//         // Copy files from source to destination
//         await fs.copy(sourceDir, destinationDir)
//         console.log("Files copied successfully")
//     } catch (err) {
//         console.error("Error copying files:", err)
//     }
// }

// copyFiles()


const start = async function () {
    const destinationDir = "./lib"
    const src = "../public"
    const copy = "./lib/public"
    const serverHtmlSrc = "../dist/deepscrape/server/index.server.html"
    const serverHtmlDest = `${copy}/index.server.html`
    // Angular SSR runtime packaged into the deploy so the BFF can engine-render
    // dynamic (non-prerendered) routes with real server markup + #ng-state.
    const serverSrc = "../dist/deepscrape/server"
    const serverDest = "./lib/server"
    const browserSrc = "../dist/deepscrape/browser"
    const browserDest = "./lib/browser"

    await fs.emptyDir(destinationDir)
    await fs.remove(copy)
    await fs.copy(src, copy)

    if (await fs.pathExists(serverSrc)) {
        await fs.copy(serverSrc, serverDest)
        console.log("angular ssr server bundle copied successfully")
    } else {
        console.warn(
            "dist/deepscrape/server not found; " +
            "engine-render will stay disabled."
        )
    }

    if (await fs.pathExists(browserSrc)) {
        await fs.copy(browserSrc, browserDest)
        console.log("angular browser assets copied successfully")
    } else {
        console.warn(
            "dist/deepscrape/browser not found; skipping browser copy."
        )
    }

    if (await fs.pathExists(serverHtmlSrc)) {
        await fs.copy(serverHtmlSrc, serverHtmlDest)
        console.log("index.server.html copied successfully")
        return
    }

    console.warn(
        "index.server.html not found at " +
         "../dist/deepscrape/server/index.server.html; skipping copy."
    )
}
start()
