/* eslint-disable indent */
/* eslint-disable require-jsdoc */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as admin from "firebase-admin"
import Stripe from "stripe"
import { defineSecret, projectID } from "firebase-functions/params"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"
import * as crypto from "crypto"

const secretManager = new SecretManagerServiceClient()
export const stripeSecretDef = defineSecret("stripeSecretTest")
export const dbName = process.env.DB_NAME || "easyscrape"

const projectId = process.env["GCP_PROJECT_ID"] || projectID

// apiKey: process.env.FIRE_API_KEY,
// authDomain: process.env.FIRE_AUTH_DOMAIN,
// databaseURL: process.env.FIRE_DATABASE_URL,
// projectId: process.env.FIRE_PROJECT_ID,
// storageBucket: process.env.FIRE_STORAGE_BUCKET,
// messagingSenderId: process.env.FIRE_MESSAGING_SENDER_ID,
// appId: process.env.FIRE_APP_ID,
const firebaseConfig: admin.AppOptions = {

    databaseURL: process.env.FIRE_DATABASE_URL,
    projectId: process.env.FIRE_PROJECT_ID,
    storageBucket: process.env.FIRE_STORAGE_BUCKET,
}
// Initialize Firebase
admin.initializeApp(firebaseConfig)

export const db = admin.firestore()
db.settings({ databaseId: dbName })

export const auth = admin.auth()
/* config().stripe?.secret */
export const stripeSecret = process.env["STRIPE_PUBLIC_KEY"] || ""
// export const stripePublishable = serviceAccount.stripe.publishable;
// export const stripeClientId = serviceAccount.stripe.clientid;
export const stripe = new Stripe(stripeSecret)

// Helper: Generate a secure random API key
export function generateApiKey() {
    return crypto.randomBytes(32).toString("hex")
}


// Helper: Store API key in Cloud Secret Manager
export async function saveToSecretManager(secretId: any, apiKey: any) {
    // Create a new secret
    const [secret] = await secretManager.createSecret({
        parent: `projects/${projectId}`,
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

export async function getSecretFromManager(secretPath: any) {
    // Get the secret version
    const [version] = await secretManager.accessSecretVersion({
        name: secretPath + "/versions/latest",
    })
    // Return the API key to show the user
    return version.payload?.data?.toString()
}
