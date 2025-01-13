/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable object-curly-spacing */
import { onCall } from "firebase-functions/v1/https"
import { db, dbName, getSecretFromManager, saveToSecretManager, stripe } from "./config"
import { createCustomer } from "./stripe"
import { auth, firestore } from "firebase-functions/v1"
// import { onRequest } from "firebase-functions/https"

export const createStripeCustomer = auth
    .user().onCreate(async (user: any) => {
        const firebaseUID = user.uid
        const fireUserDoc = `users/${firebaseUID}`
        try {
            const userDoc = await db.doc(fireUserDoc).get()
            const firebaseUser = userDoc.data()

            const customer = await createCustomer(firebaseUser)
            const stripeId = customer?.id

            await db.doc(fireUserDoc).update({
                stripeId,
            })

            // return { doc, error: null }
        } catch (error) {
            console.log(error)
            // return { doc: null, error }
        }
    })


export const createPaymentIntent = onCall(
    // { secrets: [stripeSecretDef] },
    async (data, context) => {
        // Where the cart id is the cart id of last paymentIntent
        // plan chosen plan from cache memmory
        let clientSecret = ""
        let { uid, amount, currency, cartId } = data
        try {
            const userId = context?.auth?.uid
            console.log(`userId : ${userId}`, uid)

            // Get the user from firestore
            const userDoc = await db.doc(`users/${userId}`).get()
            const user = userDoc.data()

            // Get the user's email
            const userEmail: string = user?.providerData?.length ?
                user?.providerData[0]?.email : ""


            // if cartId is not in session of the browser storage
            if (!cartId) {
                /* const listpayment = await stripe.paymentIntents.list({ customer: user?.stripeId })
                // cancel all previous paymentIntent
                listpayment.data.forEach(async (item) => {
                    await stripe.paymentIntents.cancel(item.id)
                }) */
                const paymentIntent = await stripe.paymentIntents.create({
                    receipt_email: userEmail,
                    currency,
                    customer: user?.stripeId,
                    payment_method_types: ["card"],
                    amount,
                })
                // FIXME: need to specified the cartId or create new cart if it doesn't exist
                const newCart = await db.collection(`users/${userId}/cart`).add({
                    paymentIntentId: paymentIntent.id,
                    status: paymentIntent.status,
                    created_At: paymentIntent.created,
                    lastPaymentAttempt: new Date().getUTCDate(),
                })
                cartId = newCart.id
                clientSecret = paymentIntent.client_secret || "" // or is null
            } else {
                // retrieve the paymentIntent where already Created
                const cartData = await db.doc(`users/${userId}/cart/${cartId}`).get()
                const cart = cartData.data()

                // get the latest used paymentIntentId
                if (cart?.paymentIntentId) {
                    const incompleteIntent = await stripe.paymentIntents.retrieve(cart?.paymentIntentId)
                    /* if (incompleteIntent.status === "requires_payment_method") {} */
                    clientSecret = incompleteIntent.client_secret || "" // or is null
                }
            }

            return { clientSecret, cartId }
        } catch (error) {
            console.log(error)
            return { error: "cannot create a payment intent" }
        }
    }
)


export const startSubscription = onCall(
    async (data, context) => {
        // 1. Get user data
        // eslint-disable-next-line max-len
        const userId = context?.auth?.uid
        const userDoc = await db.doc(`users/${userId}`).get()
        const user = userDoc.data()

        // a. Extract price and source and currency from the data
        const { price, source, currency } = data

        // 2. Attach the card to the user
        await stripe.customers.createSource(user?.stripeId, {
            source,
        })

        // 3. Subscribe the user to the plan you created in stripe
        const sub = await stripe.subscriptions.create({
            customer: user?.stripeId,
            items: [{ price }],
            currency,
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

export const updateUsage = firestore
    .database(dbName)
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


// Firebase Function: Create API Key
export const createMyApiKey = onCall(async (data, context) => {
    const { apiKey } = data

    try {
        const userId = context?.auth?.uid
        if (!userId) {
            throw new Error("User must be authenticated")
        }

        // const apiKeyId = crypto.randomUUID()
        // const apiKey = generateApiKey()

        // Save metadata in Firestore
        const newApiKeyDoc = await db.collection(`users/${userId}/apikeys`).doc()

        // Save API key in Secret Manager
        const secretName = `users_${userId}_apikey_${newApiKeyDoc.id}`
        const secretPath = await saveToSecretManager(secretName, apiKey.key)

        await newApiKeyDoc.set({
            secretPath,
            permissions: apiKey.permissions || [],
            name: apiKey.name,
            default: apiKey.default,
            showKey: apiKey.showKey,
            type: apiKey.type,
            created_At: new Date(),
            created_By: userId,
        }, { merge: true })

        return { error: null, apiKeyId: newApiKeyDoc.id, message: "API key created successfully" }
    } catch (error) {
        console.error("Error creating API key:", error)
        // throw new Error("Failed to create API key by id " + apiKeyId)
        return { error, apiKeyId: null, message: "Failed to create API key by id" }
    }
})

export const retrieveMyApiKeysPaging = onCall(

    async (data, context) => {
        const { apiKeyPage, pageSize = 10 } = data
        try {
            const userId = context?.auth?.uid
            const page: number = apiKeyPage || 1
            const limit: number = pageSize

            if (!userId) {
                throw new Error("User must be authenticated")
            }

            const apiKeysRef = db.collection(`users/${userId}/apikeys`)
            const apiKeysQuery = apiKeysRef.orderBy("created_At", "desc").limit(limit)

            if (page > 1) {
                const previousLimit = limit * (page - 1)
                const lastDoc = await apiKeysRef.orderBy("created_At", "desc").limit(previousLimit).get()
                const lastDocument = lastDoc.docs[lastDoc.size - 1]
                apiKeysQuery.startAfter(lastDocument)
            }

            const apiKeys = await apiKeysQuery.get()
            const apiKeysData = apiKeys.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

            return { error: null, apiKeys: apiKeysData, message: "API keys retrieved successfully" }
        } catch (error) {
            console.error("Error retrieving API key:", error)
            // throw new Error("Failed to create API key by id " + apiKeyId)
            return { error, apiKeys: null, message: "Failed to retrieve API key by id" }
        }
    })


/**
    before retrieve secret add this policy
    for these accounts: serviceAccount:firebase-adminsdk-ju1ex@libnet-d76db.iam.gserviceaccount.com

    gcloud projects add-iam-policy-binding 332716075857 --member="serviceAccount:libnet-d76db@appspot.gserviceaccount.com"
    --role="roles/secretmanager.secretAccessor"
    --condition="expression=request.time < timestamp('2030-01-01T00:00:00Z'),title=AccessBefore2030,description=Allow access until 2030"

    check available policies
    bash: gcloud iam service-accounts list --project=libnet-d76db
**/
export const getApiKeyDoVisible = onCall(async (data, context) => {
    const { apiKey } = data

    try {
        const userId = context?.auth?.uid
        if (!userId) {
            throw new Error("User must be authenticated")
        }

        const apiKeysRef = db.doc(`users/${userId}/apikeys/${apiKey.id}`)
        const key = await apiKeysRef.get()
        const keyData = key.data()

        if (!keyData) {
            throw new Error("API key not found")
        }

        const secretValue = await getSecretFromManager(keyData.secretPath)

        if (!secretValue) {
            throw new Error("cannot retrieve the secret from secret Manager Client")
        }

        const keyDataWithSecret = {
            ...keyData,
            id: apiKey.id,
            key: secretValue,
        }

        return { error: null, apiKey: keyDataWithSecret, message: "API key retrieved successfully" }
    } catch (error) {
        console.error("Error retrieving API key:", error)
        // throw new Error("Failed to create API key by id " + apiKeyId)
        return { error, apiKeyId: null, message: "Failed to retrieve API secret" }
    }
})
