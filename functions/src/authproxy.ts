/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */

import { Router } from "express"
import { checkUserEmailForDifferentProvider,
    verifyLogin} from "./handlers/fire_auth"

/* eslint-disable max-len */
class AuthAPIProxy {
    public router: Router

    constructor() {
        this.router = Router()
        this.httpRoutesGets()
        this.httpRoutesPosts()
        // this.httpRoutesPut()
        // this.httpRoutesDelete()
    }

    private httpRoutesGets(): void {
        // Check if user email exists and which provider is used
        this.router.get("/provider/email/:email", checkUserEmailForDifferentProvider)
    }

    private httpRoutesPosts(): void {
        // Verify and link provider
        // This is used to link a new provider to an existing user account
        this.router.post("/verify-login", verifyLogin)
    }
}

export { AuthAPIProxy }
