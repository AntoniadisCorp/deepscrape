/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */

import { Router } from "express"
import {
    checkUserEmailForDifferentProvider,
    updateEmailVerificationStatus,
    verifyLogin,
    verifyPhoneNumber,
    linkPhoneToAccount,
    updatePhoneVerificationStatus,
    checkPhoneNumberExists,
} from "../handlers"

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

        // Check if phone number exists
        this.router.get("/provider/phone/:phoneNumber", checkPhoneNumberExists)
    }

    private httpRoutesPosts(): void {
        // Verify and link provider
        // This is used to link a new provider to an existing user account
        this.router.post("/verify-login", verifyLogin)

        // Email verification
        this.router.post("/email/verification", updateEmailVerificationStatus)

        // Phone verification endpoints
        this.router.post("/phone/verify", verifyPhoneNumber)
        this.router.post("/phone/link", linkPhoneToAccount)
        this.router.post("/phone/update-verification", updatePhoneVerificationStatus)
    }
}

export { AuthAPIProxy }
