/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */
import { auth } from "../app/config"
import { Request, Response } from "express"


export const checkUserEmailExistance = async (req: Request, res: Response) => {
    const { email } = req.params as { email: string }
    try {
        // test email before checking providers with pattern
        // eslint-disable-next-line max-len
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const checkUserEmailExistance = async (req: Request, res: Response) => {
    const { email } = req.params as { email: string }
    try {
        // test email before checking providers with pattern
        // eslint-disable-next-line max-len
        if (!email || !EMAIL_REGEX.test(email)) {
            return res.status(400).send({ error: "Invalid email format" })
        }

        // Check if the user exists by email
        const userRecord = await auth.getUserByEmail(email)
        const providers = userRecord.providerData
            .map((provider) => provider.providerId)
        if (providers.length > 1) {
            return res.status(200).send({
                emailExists: true,
                providers: providers,
                hasMultipleProviders: true,
            })
        } else {
            return res.status(200).send({
                emailExists: true,
                providers: providers,
                hasMultipleProviders: false,
            })
        }
    } catch (error: any) {
        if (error.code === "auth/user-not-found") {
            return res.status(200).send({ emailExists: false })
        }
        console.error("Error checking user email existence:", error)
        return res.status(500).send({ error: "Internal Server Error" })
    }
}

export const checkUserEmailForDifferentProvider =
    async (req: Request, res: Response) => {
        const { email } = req.params as { email: string }
        res.type("json")
        try {
            // eslint-disable-next-line max-len
            if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                return res.status(400).send({ error: "Invalid email format",
                    message: "Please provide a valid email address." })
            }
            const userRecord = await auth.getUserByEmail(email)
            const providers = userRecord.providerData
                .map((provider) => provider.providerId)


            if (providers.length > 1) {
                return res.status(200).send({
                    exists: true,
                    providers: providers,
                    hasMultipleProviders: true,
                })
            } else {
                return res.status(200).send({
                    exists: true,
                    providers: providers,
                    hasMultipleProviders: false,
                })
            }
        } catch (error: any) {
            if (error.code === "auth/user-not-found") {
                return res.status(200).send({ exists: false })
            }
            console.error(
                "Error checking user email for different provider:",
                error,
            )
            return res.status(500).send({ error: "Internal Server Error",
                message: error })
        }
    }

export const verifyLogin = async (req: Request, res: Response) => {
    const { idToken, providerId } = req.body

    if (!idToken || !providerId) {
        return res.status(400).send({ error: "Missing idToken or providerId" })
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken)
        let { email, uid: newUid } = decodedToken

        if (!email) {
            // return res.status(400)
            // .send({ error: "Email not found in ID token" })
            console.warn("Email not provided in request body," +
                " using decoded token email")
            const newUser = await auth.getUser(newUid)
            email = newUser.email || ""
            if (!email) {
                console.error("Email not found in decoded token or user record")
                return res.status(400)
                .send({ error: "Email not found in New User" })
            }
        }

        let existingUserRecord
        try {
            existingUserRecord = await auth.getUserByEmail(email)
        } catch (error: any) {
            if (error.code === "auth/user-not-found") {
                 // No existing user → keep this new provider account
                // Case 1: No user exists with this email. This is a new signup.
                // Firebase automatically creates a user
                // when signInWithPopup is used.
                // The decodedToken.uid is the UID of this newly created user.
                // We just need to confirm it's
                // not a duplicate and return success.
                // message: "No existing account, signup success"
                return res.status(200)
                .send({ mergeRequired: false })
            }
            throw error // Re-throw other errors
        }

        // If we reach here, an existing user with the same email was found.
        if (existingUserRecord.uid === newUid) {
            // Already unified
            // Case 2: User exists with the same UID. Normal login.
            // message: "User already linked"
            return res.status(200)
                .send({ mergeRequired: false })
        } else {
            // Case 3: User exists with a different UID but same email.
            //  Merge required.
            // Delete the newly created user
            // (decodedToken.uid) to avoid orphaned accounts.
            await auth.deleteUser(newUid)
            // message: "Account exists, please link new provider",
            return res.status(200)
            .send({ mergeRequired: true, existingUid: existingUserRecord.uid })
        }
    } catch (error: any) {
        console.error("Error in verifyLogin, Merge provider error:", error)
        return res.status(500)
        .send({ error: "Internal Server Error", message: error.message })
    }
}
