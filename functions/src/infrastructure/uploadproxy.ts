/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */

import { Router } from "express"
import { arachnefly } from "../handlers"
// import multer from "multer"
// const upload = multer({ storage: multer.memoryStorage(),
//     limits: { fileSize: 50 * 1024 * 1024 } }) // 50 MB limit

class UploadAPIProxy {
    public router: Router
    constructor() {
        this.router = Router()
                this.httpRoutesGets()
                this.httpRoutesPosts()
    }

    private httpRoutesGets(): void {
    }

    private httpRoutesPosts(): void {
         // Deploy a new Machine
        this.router.post("/machines/deploy", arachnefly.deployMachine)
    }
}

export { UploadAPIProxy }
