/* eslint-disable indent */
/* eslint-disable require-jsdoc */
const fs = require("fs-extra")

/* const sourceDir = "../dist/deepscrape/server"
const destinationDir = "./server"

async function copyFiles() {
    try {
        // Ensure the destination directory exists
        await fs.ensureDir(destinationDir)

        // Ensure the destination directory exists and clean it
        await fs.emptyDir(destinationDir)
        console.log("Destination directory cleaned.")

        // Copy files from source to destination
        await fs.copy(sourceDir, destinationDir)
        console.log("Files copied successfully")
    } catch (err) {
        console.error("Error copying files:", err)
    }
}

copyFiles()
 */

const start = async function () {
    const src = "../public"
    const copy = "./lib/public"

    await fs.remove(copy)
    await fs.copy(src, copy)
}
start()
