/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
/* eslint-disable @typescript-eslint/no-empty-function */

import { Request, Response } from "express"
import { auth } from "../app/config"

// Phone number validation regex (E.164 format)
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/

export const verifyPhoneNumber = async (req: Request, res: Response) => {
    const { phoneNumber } = req.body as { phoneNumber: string }

    try {
        // Validate phone number format
        if (!phoneNumber || !PHONE_REGEX.test(phoneNumber)) {
            return res.status(400).send({
                error: "Invalid phone number format",
                message:
                    "Phone number must be in E.164 format " +
                    "(e.g., +1234567890)",
            })
        }

        // Check if phone number is already in use
        try {
            await auth.getUserByPhoneNumber(phoneNumber)
            return res.status(409).send({
                error: "Phone number already exists",
                message:
                    "This phone number is already associated with another " +
                    "account",
            })
        } catch (error: any) {
            // If user not found, that's good - we can proceed
            if (error.code !== "auth/user-not-found") {
                throw error
            }
        }

        return res.status(200).send({
            available: true,
            message: "Phone number is available",
        })
    } catch (error: any) {
        console.error("Error verifying phone number:", error)
        return res.status(500).send({
            error: "Internal Server Error",
            message: error.message,
        })
    }
}

export const linkPhoneToAccount = async (req: Request, res: Response) => {
    const { uid, phoneNumber } = req.body as {
        uid: string,
        phoneNumber: string
    }

    try {
        if (!uid || !phoneNumber) {
            return res.status(400).send({
                error: "Missing required fields",
                message: "Both uid and phoneNumber are required",
            })
        }

        // Validate phone number format
        if (!PHONE_REGEX.test(phoneNumber)) {
            return res.status(400).send({
                error: "Invalid phone number format",
                message: "Phone number must be in E.164 format",
            })
        }

        // Check if phone number is already in use by another user
        try {
            const existingUser = await auth.getUserByPhoneNumber(phoneNumber)
            if (existingUser.uid !== uid) {
                return res.status(409).send({
                    error: "Phone number already in use",
                    message:
                        "This phone number is already associated with" +
                        " another account",
                })
            }
        } catch (error: any) {
            // If user not found, that's fine - we can link it
            if (error.code !== "auth/user-not-found") {
                throw error
            }
        }

        // Update user with phone number
        await auth.updateUser(uid, {
            phoneNumber,
        })

        return res.status(200).send({
            success: true,
            message: "Phone number linked successfully",
        })
    } catch (error: any) {
        console.error("Error linking phone to account:", error)
        return res.status(500).send({
            error: "Internal Server Error",
            message: error.message,
        })
    }
}

export const updatePhoneVerificationStatus = async (
    req: Request,
    res: Response
) => {
    const {
        uid,
        phoneVerified,
    } = req.body as {
        uid: string,
        phoneVerified: boolean,
    }

    try {
        if (!uid || typeof phoneVerified !== "boolean") {
            return res.status(400).send({
                error: "Missing required fields",
                message: "Both uid and phoneVerified are required",
            })
        }

        // Set custom claims for phone verification
        await auth.setCustomUserClaims(uid, { phoneVerified })

        return res.status(200).send({
            success: true,
            message: "Phone verification status updated successfully",
        })
    } catch (error: any) {
        console.error("Error updating phone verification status:", error)
        return res.status(500).send({
            error: "Internal Server Error",
            message: error.message,
        })
    }
}

export const checkPhoneNumberExists = async (req: Request, res: Response) => {
    res.type("application/json")
    const { phoneNumber } = req.body as { phoneNumber: string }

    try {
        if (!phoneNumber || !PHONE_REGEX.test(phoneNumber)) {
            return res.status(400).send({
                error: "Invalid phone number format",
                message: "Phone number must be in E.164 format",
            })
        }

        try {
            const userRecord = await auth.getUserByPhoneNumber(phoneNumber)
            return res.status(200).send({
                exists: true,
                uid: userRecord.uid,
                providers: userRecord.providerData.map(
                    (provider: { providerId: string }) =>
                        provider.providerId
                ),
            })
        } catch (error: any) {
            if (error.code === "auth/user-not-found") {
                return res.status(200).send({ exists: false })
            }
            throw error
        }
    } catch (error: any) {
        console.error("Error checking phone number existence:", error)
        return res.status(500).send({
            error: "Internal Server Error",
            message: error.message,
        })
    }
}
