/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/*
https://medium.com/@unravel-technologies/angular-loading-performance-deploying-ssr-ssg-to-firebase-2a48d4cc7fc5
*/
import { onRequest } from "firebase-functions/v2/https"
import { app } from "./server"
// import path, { join } from "node:path"

// import { fileURLToPath } from "node:url"


// Get the current file's directory fileURLToPath
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)

// Dynamically resolve the server path using a file URL
// const serverFile = `file:///${join(__dirname, "..", "..", "dist", "deepscrape", "server", "server.mjs")}`
// const serverFile = `file:///${join(__dirname, "..", "..", "dist", "deepscrape", "server", "server.mjs")}`
// const serverPath = `file://${join(__dirname, "..", "..", "dist", "deepscrape", "server")}`
// console.log(__filename, serverPath, __dirname)
// const absolutePath = path.resolve(serverFile);
// const moduleUrl = `file://${fileURLToPath(`file:///${absolutePath}`)}`
// console.log(moduleUrl)
// // Wrapper function to handle server loading
// const universal = () => {
//     try {
//         // Check if the file exists before importing
//         /* if (!fs.existsSync(serverFile)) {
//             throw new Error(`Server file not found at ${serverFile}`)
//         } */

//         // Dynamically import the server
//         // const { app } = server

//         // Return the server app
//         return app
//     } catch (error) {
//         console.error("Error loading server module:", error)
//         throw error
//     }
// }

// Export the Firebase Function
export const deepscrape = onRequest(app)
/*
initializeApp({ databaseURL: "https://libnet-d76db-default-rtdb.europe-west1.firebasedatabase.app" }
    , "easyscrape")

const db = firestore()
console.log(db.databaseId)

const stripeApiKey = config().stripe.secret
const stripe = new Stripe(stripeApiKey)
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)


export const createStripeCustomer = auth.user().onCreate(async (user: any) => {
    const firebaseUID = user.uid

    const customer = await stripe.customers.create({
        metadata: { firebaseUID },
    })

    const stripeId = customer?.id

    return db.doc(`users/${firebaseUID}`).update({
        stripeId,
    })
})

export const startSubscription = https.onCall(
    async (data, context) => {
        // 1. Get user data
        // eslint-disable-next-line max-len
        const plan = "prod_RTyLTIByGOFxQf"
        const userId = context?.auth?.uid
        const userDoc = await db.doc(`users/${userId}`).get()
        const user = userDoc.data()

        // 2. Attach the card to the user
        await stripe.customers.createSource(user?.stripeId, {
            source: data.source,
        })

        // 3. Subscribe the user to the plan you created in stripe
        const sub = await stripe.subscriptions.create({
            customer: user?.stripeId,
            items: [{ plan }],
            currency: "eur",
        })

        // 4. Update user document
        return db.doc(`users/${userId}`).update({
            status: sub.status,
            currentUsage: 0,
            subscriptionId: sub.id,
            itemId: sub.items.data[0].id,
        })
    }
)

export const updateUsage = fireDB
    .database("easyscrape")
    .document("projects/{projectId}")
    .onCreate(async (snap: any) => {
        const userRef = db.doc(`users/${snap.data().userId}`)

        const userDoc = await userRef.get()
        const user = userDoc.data()

        await stripe.billing.meterEvents.create(
            {
                event_name: "blaze_plan_monthly",
                payload: {
                    "stripe_customer_id": user?.stripeId,
                    "value": "1",
                },
                timestamp: (Date.parse(snap.createTime) / 1000) | 0,
            },
            {
                idempotencyKey: snap.id,
            },
        )
        await stripe.subscriptionItems.createUsageRecord(
            user?.itemId,
            {
                quantity: 1,
                action: "increment",
                timestamp: (Date.parse(snap.createTime) / 1000) | 0,
            },
            {
                idempotencyKey: snap.id,
            },
        )


        return userRef.update({ currentUsage: user?.currentUsage + 1 })
    })
 */
