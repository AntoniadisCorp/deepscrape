/* eslint-disable indent */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as admin from "firebase-admin"
import Stripe from "stripe"
import serviceAccount from "../credentials.json"
import { defineJsonSecret } from "firebase-functions/params"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"
import * as crypto from "crypto"
import { env } from "../config/env"

const secretManager = new SecretManagerServiceClient()
export const functionsConfigExportSecretName = "FUNCTIONS_CONFIG_EXPORT"
export const functionsConfigExportSecret =
    defineJsonSecret(functionsConfigExportSecretName)
export const dbName = serviceAccount.dbName

// Initialize Firebase
admin.initializeApp(serviceAccount.firebaseConfig)

export const db = admin.firestore()
db.settings({ databaseId: dbName })

export const auth = admin.auth()

type ExportedFunctionsConfig = {
    stripe?: {
        secret?: string
    }
}

const getStripeSecretFromExport = () => {
    try {
        const configValue = functionsConfigExportSecret.value()
        const config =
            configValue as ExportedFunctionsConfig | undefined
        return config?.stripe?.secret || ""
    } catch {
        return ""
    }
}

export const stripeSecret =
    getStripeSecretFromExport() ||
    env.STRIPE_PUBLIC_KEY ||
    serviceAccount.stripe.secret
// export const stripePublishable = serviceAccount.stripe.publishable;
// export const stripeClientId = serviceAccount.stripe.clientid;
export const stripe = new Stripe(stripeSecret)

// Helper: Generate a secure random API key
export function generateApiKey() {
    return crypto.randomBytes(32).toString("hex")
}


// Helper: Store API key in Cloud Secret Manager
export async function saveToSecretManager(
    secretId: string | null | undefined,
    apiKey: string
) {
    // Create a new secret
    const [secret] = await secretManager.createSecret({
        parent: `projects/${env.GCP_PROJECT_ID}`,
        secretId,
        secret: {
            replication: {
                automatic: {},
            },
        },
    })

    // Add the API key as a new version
    await secretManager.addSecretVersion({
        parent: secret.name,
        payload: {
            data: Buffer.from(apiKey, "utf8"),
        },
    })

    // Assign IAM policy for specific user
    /* const policy = {
        bindings: [
            {
                role: "roles/secretmanager.secretAccessor",
                members: [`user:${userEmail}`],
            },
        ],
    }

    await secretManager.setIamPolicy({
        resource: secret.name,
        policy,
    }) */

    return secret.name
}

export async function getSecretFromManager(secretPath: string) {
    // Get the secret version
    const [version] = await secretManager.accessSecretVersion({
        name: secretPath + "/versions/latest",
    })
    // Return the API key to show the user
    return version.payload?.data?.toString()
}

