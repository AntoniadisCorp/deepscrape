/* eslint-disable space-before-function-paren */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable linebreak-style */
/* eslint-disable indent */
/* eslint-disable semi */
const fs = require("fs-extra")

const start = async function () {
    const src = "../dist"
    const copy = "./dist"

    await fs.remove(copy)
    await fs.copy(src, copy)
}
start()
