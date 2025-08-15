/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable object-curly-spacing */
import { db, dbName, getSecretFromManager, saveToSecretManager, stripe/* , auth as adminAuth */ } from "./config"
// import { createCustomer } from "./stripe"
import { firestore, auth, EventContext } from "firebase-functions/v1"
import { HttpsError, onCall as onCallv2 } from "firebase-functions/v2/https"
import { redis } from "./cacheConfig"
import { QueryDocumentSnapshot } from "firebase-functions/v2/firestore"
import { createCustomer } from "./stripe"

export const newStripeCustomer = auth
    .user()
    .onCreate(
        async (user: auth.UserRecord, context: EventContext) => {
        context.auth?.uid
        // Create a new Stripe customer when a new user is created
        const userId = user.uid || context.auth?.uid
        const userPath = `users/${userId}`


        try {
            const userDoc = await db.doc(userPath).get()
            const firebaseUser = userDoc.data()
            if (!firebaseUser) {
                throw new Error(`User document not found for userId: ${userId}`)
            }

            const customer = await createCustomer(firebaseUser)
            const stripeId = customer?.id

            await db.doc(userPath).update({
                stripeId,
            })

            // return { doc, error: null }
        } catch (error) {
            console.log(error)
            // return { doc: null, error }
        }
    })


export const createPaymentIntent = onCallv2(
    // { secrets: [stripeSecretDef] },
    async (req) => {
        // Where the cart id is the cart id of last paymentIntent
        // plan chosen plan from cache memmory
        let clientSecret = ""
        let { uid, amount, currency, cartId } = req.data
        try {
            const userId = req?.auth?.uid
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


export const startSubscription = onCallv2(
    async (req) => {
        // 1. Get user data
        // eslint-disable-next-line max-len
        const userId = req?.auth?.uid
        const userDoc = await db.doc(`users/${userId}`).get()
        const user = userDoc.data()

        // a. Extract price and source and currency from the data
        const { price, source, currency } = req.data

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
    .onCreate(async (snap:QueryDocumentSnapshot) => {
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
                timestamp: Math.floor(snap.createTime.toDate().getTime() / 1000),
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
                timestamp: Math.floor(snap.createTime.toDate().getTime() / 1000),
            },
            {
                idempotencyKey: snap.id,
            },
        )


        return userRef.update({ currentUsage: user?.currentUsage + 1 })
    })


// Firebase Function: Create API Key
export const createMyApiKey = onCallv2(async (req) => {
    const { apiKey } = req.data

    try {
        const userId = req?.auth?.uid
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

export const retrieveMyApiKeysPaging = onCallv2(

    async (req) => {
        const { apiKeyPage, pageSize = 10 } = req.data
        try {
            const userId = req?.auth?.uid
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
export const getApiKeyDoVisible = onCallv2(async (req) => {
    const { apiKey } = req.data

    try {
        const userId = req?.auth?.uid
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

export const enqueueCrawlOperation = firestore
    .database(dbName)
    .document("users/{userId}/operations/{operationId}")
    .onWrite(async (snap, context) => {
        const after = snap.after.exists ? snap.after.data() : null
        // check to see if the operation is ready to be processed or to be Scheduled
        if (!after || !(after.status === "Start" || after.status === "Scheduled")) {
            return null // Ignore non-ready or deleted operations
        }
        const operationId = context.params.operationId
        const userId = context.params.userId

        const task = {
            operationId,
            scheduled_At: after?.scheduled_At,
            status: after.status,
            author: after?.author,
            uid: userId,
            urls: after?.urls,
            modelAI: after?.modelAI,
            metadataId: after?.metadataId,
            sumPrompt: after?.sumPrompt,
        }

        // const { client: redis, release } = await getRedisClient()
        try {
            const num = await redis.lpush("operation_queue", JSON.stringify(task))
            console.log(`Operation ${operationId} queued successfully in position`, num)
            return true
        } catch (error) {
            console.error(`Error enqueuing operation ${operationId}:`, error)
            throw new HttpsError("internal", `Error enqueuing operation ${operationId}`)
        } /* finally {
            release() // Always release the client back to the pool
        } */
    })

export const getOperationsPaging = onCallv2(

    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            const userId = req?.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const operationsRef = db.collection(`users/${userId}/operations`).orderBy("created_At", "desc")

            // Check if collection exists
            const snapshot = await operationsRef.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    operations: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "Operations retrieved successfully",
                }
            }

            // Get total count of operations
            const totalOperationsQuery = await operationsRef.count().get()
            const inTotal = totalOperationsQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }

            let query = operationsRef.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await operationsRef.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const operationsSnapshot = await query.get()
            const operations = operationsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                operations,
                totalPages,
                inTotal,
                message: "Operations retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving operations:", error)
            throw new HttpsError("internal", "Failed to retrieve operations by pagination.")
        }
    })


export const getBrowserProfilesPaging = onCallv2(

    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const profilesRef = db.collection(`users/${userId}/browser`).orderBy("created_At", "desc")

            // Check if collection exists
            const snapshot = await profilesRef.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    profiles: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "Browser Profiles retrieved successfully",
                }
            }

            // Get total count of operations
            const totalBrowserProfilesQuery = await profilesRef.count().get()
            const inTotal = totalBrowserProfilesQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }

            let query = profilesRef.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await profilesRef.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const profilesSnapshot = await query.get()
            const profiles = profilesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                profiles,
                totalPages,
                inTotal,
                message: "Browser Profiles retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving browser profiles paging:", error)
            throw new HttpsError("internal", "Failed to retrieve browser profiles by pagination.")
        }
    })

export const getCrawlConfigsPaging = onCallv2(

    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const configsRef = db.collection(`users/${userId}/crawlconfigs`).orderBy("created_At", "desc")

            // Check if collection exists
            const snapshot = await configsRef.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    configs: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "Crawler Configs retrieved successfully",
                }
            }

            // Get total count of operations
            const totalCrawlConfigsQuery = await configsRef.count().get()
            const inTotal = totalCrawlConfigsQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }

            let query = configsRef.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await configsRef.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const configsSnapshot = await query.get()
            const configs = configsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                configs,
                totalPages,
                inTotal,
                message: "Crawler Configs retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving Crawler Configurations paging:", error)
            throw new HttpsError("internal", "Failed to retrieve Crawler Configurations by pagination.")
        }
    })

export const getCrawlResultConfigsPaging = onCallv2(
    async (req) => {
        const { currPage = 1, pageSize = 10 } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const configsRef = db.collection(`users/${userId}/crawlresultsconfig`).orderBy("created_At", "desc")

            // Check if collection exists
            const snapshot = await configsRef.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    crawlResultConfigs: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "CrawlResult Configs retrieved successfully",
                }
            }

            // Get total count of operations
            const totalCrawlResultConfigsQuery = await configsRef.count().get()
            const inTotal = totalCrawlResultConfigsQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }

            let query = configsRef.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await configsRef.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const configsSnapshot = await query.get()
            const crawlResultConfigs = configsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                crawlResultConfigs,
                totalPages,
                inTotal,
                message: "CrawlResult Configs retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving CrawlResult Configurations paging:", error)
            throw new HttpsError("internal", "Failed to retrieve CrawlResult Configurations by pagination.")
        }
    })
/*
export const receiveLogs = onRequest(async (request, response) => {
    const authHeader = request.headers.authorization

    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //     return response.status(401).send("Unauthorized")
    // }
    const body = request.body as string

    try {
        // const token = authHeader.split("Bearer ")[1]
        // await adminAuth.verifyIdToken(token) // Validate token


        const logs: string[] = body.split("\n").filter(Boolean) // Split by newlines and filter empty strings
        const logPromises = logs.map((log: any) => {
            const parsedLog = JSON.parse(log)
            // return db.collection(`users/${userId}/logs`).add({
            //     ...parsedLog,
            //     timestamp: Timestamp,
            // })
            return parsedLog
        })

        // Process each log entry
        logs.forEach((log: any) => {
            console.log(log, authHeader) // Log to Firebase Function logs for debugging
            // Optionally, store in Firestore or another database
            // Example: admin.firestore().collection('logs').add(JSON.parse(log));
        })
        await Promise.all(logPromises)
        response.sendStatus(200) // Respond with success
    } catch (error) {
        console.error("Error retrieving the machine logs from fly datadog:", error)
        response.sendStatus(404) // Respond with success
        // throw new HttpsError("internal", "Error retrieving the machine logs from fly datadog")
    }
})
 */

export const getMachinesPaging = onCallv2(
    async (req) => {
        const { currPage = 1, pageSize = 10, state = null } = req.data

        try {
            const userId = req.auth?.uid
            if (!userId) {
                throw new HttpsError("unauthenticated", "User must be authenticated.")
            }

            const machinesRef = db.collection(`users/${userId}/machines`).orderBy("created_at", "desc")
            const filteredQuery = state && typeof state == "string" ? machinesRef.where("state", "==", state) : machinesRef.where("state", "!=", "destroyed")
            // Check if collection exists
            const snapshot = await filteredQuery.get()
            if (snapshot.empty) {
                return {
                    error: null,
                    machines: [],
                    totalPages: 1,
                    inTotal: 0,
                    message: "Machines retrieved successfully",
                }
            }

            // Get total count of operations
            const totalMachinesQuery = await filteredQuery.count().get()
            const inTotal = totalMachinesQuery.data().count || 0

            // Calculate total pages
            const totalPages = Math.ceil(inTotal / pageSize)
            if (currPage > totalPages && totalPages > 0) {
                throw new HttpsError("invalid-argument", "Requested page exceeds total pages.")
            }


            let query = filteredQuery.limit(pageSize)

            // Handle pagination using startAfter()
            if (currPage > 1) {
                const previousPageSnapshot = await filteredQuery.limit((currPage - 1) * pageSize).get()
                const lastDocument = previousPageSnapshot.docs[previousPageSnapshot.size - 1]
                if (lastDocument) {
                    query = query.startAfter(lastDocument)
                }
            }

            // Fetch operations for the current page
            const machinesSnapshot = await query.get()
            const machines = machinesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return {
                error: null,
                machines,
                totalPages,
                inTotal,
                message: "Machines retrieved successfully",
            }
        } catch (error) {
            console.error("Error retrieving the machines:", error)
            throw new HttpsError("internal", "Error retrieving the machines", error)
        }
    })
