/* eslint-disable indent */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as admin from "firebase-admin"
import Stripe from "stripe"
import { defineSecret, defineJsonSecret } from "firebase-functions/params"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"
import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"
import { env } from "../config/env"

const secretManager = new SecretManagerServiceClient()
export const stripeSecretParam = defineSecret("STRIPE_SECRET_KEY")
export const stripeWebhookSecretParam =
    defineSecret("STRIPE_WEBHOOK_SECRET")
// Holds the Firebase service account JSON in production
// (stored in Secret Manager). Must be listed in `secrets`
// on any Cloud Function that cold-starts a new instance.
export const serviceAccountKeyParam =
    defineJsonSecret("FIRE_SERVICE_ACCOUNT_KEY")
export const stripeSecrets = [stripeSecretParam, stripeWebhookSecretParam]
export const dbName = env.DB_NAME || "(default)"

const localServiceAccount = !env.IS_PRODUCTION ?
    (JSON.parse(
        fs.readFileSync(
            path.resolve(__dirname, "../serviceAccount.json"),
            "utf8"
        )
    ) as admin.ServiceAccount) : undefined


// Initialize Firebase Admin SDK:
// - Non-production: use the local credentials.json
//   file immediately (safe at deploy time).
// - Production: use defineJsonSecret so the service account key is loaded from
//   Secret Manager at runtime. env.IS_PRODUCTION is false
//   during `firebase deploy`
//   (secret values throw and are caught in env.ts → fallback to false), so
//   serviceAccountKeyParam.value() is never called at deploy time.
// Docs: https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments
admin.initializeApp({
    credential: admin.credential.cert( env.IS_PRODUCTION ?
        (serviceAccountKeyParam.value() as admin.ServiceAccount) :
         (localServiceAccount as admin.ServiceAccount)
    ),
})

export const db = admin.firestore()
db.settings({ databaseId: dbName })

export const auth = admin.auth()

const resolveStripeSecret = (secret: string | undefined) => {
    const candidate = typeof secret === "string" ? secret.trim() : ""

    if (candidate) {
        return candidate
    }

    const fromEnv = env.STRIPE_SECRET_KEY?.trim()
    if (fromEnv) {
        return fromEnv
    }

    return env.STRIPE_SECRET_KEY || ""
}

export const getStripeWebhookSecret = (secret:string | undefined) => {
    try {
        const stripeWebhookKey =
            secret as string | undefined
        return stripeWebhookKey ||
            env.STRIPE_WEBHOOK_SECRET ||
            ""
    } catch {
        return env.STRIPE_WEBHOOK_SECRET || ""
    }
}

let stripeClient: Stripe | null = null

export const getStripe = (secret: string | undefined) => {
    if (stripeClient) {
        return stripeClient
    }

    const stripeSecret = resolveStripeSecret(secret) as string | undefined
    if (!stripeSecret) {
        throw new Error("Missing Stripe secret key")
    }

    if (!stripeSecret.startsWith("sk_")) {
        throw new Error(
            "Invalid Stripe secret key format. Expected prefix sk_"
        )
    }

    stripeClient = new Stripe(stripeSecret)
    return stripeClient
}

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

