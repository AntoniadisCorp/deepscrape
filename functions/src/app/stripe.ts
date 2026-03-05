/* eslint-disable object-curly-spacing */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable indent */
// Takes a Firebase user and creates a Stripe customer account
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import {
  stripe,
  db,
  dbName,
  functionsConfigExportSecretName,
} from "./config"
import { QueryDocumentSnapshot } from "firebase-functions/v2/firestore"
import * as functionsV1 from "firebase-functions/v1"
import { EventContext } from "firebase-functions/v1"
import { HttpsError, onCall as onCallv2 } from "firebase-functions/v2/https"
import { UserInfo } from "firebase-functions/v1/auth"
import { Users } from "../domain"
import Stripe from "stripe"

/* TODO: create a Stripe customer account for the user use most usable data */
export async function createCustomer(firebaseUser: Pick<Users, "providerData" | "uid">): Promise<Stripe.Response<Stripe.Customer>> {
  const providerData = firebaseUser?.providerData as UserInfo[]

  if (!providerData || providerData.length === 0) {
    throw new Error("No provider data found for the user")
  }

  return await stripe.customers.create({
    email: providerData[0].email,
    name: providerData[0].displayName,
    phone: providerData[0].phoneNumber as string,
    metadata: { firebaseUID: firebaseUser.uid },
  })
}

/* Firebase Functions for stripe Workflow */

export const newStripeCustomer = functionsV1
  .runWith({ secrets: [functionsConfigExportSecretName] })
  .auth.user()
  .onCreate(
    async (user: functionsV1.auth.UserRecord, context: EventContext) => {
      // Create a new Stripe customer when a new user is created
      const userId = user.uid || context.auth?.uid
      const userPath = `users/${userId}`

      try {
        const userDoc = await db.doc(userPath).get()
        const firebaseUser = userDoc.data() as Users
        if (!firebaseUser) {
          throw new Error(`User document not found for userId: ${userId}`)
        }

        // Get user email
        const userEmail = firebaseUser.email || user.email

        // Check if a customer with this email already exists in Stripe
        let stripeId = null
        if (userEmail) {
          const existingCustomers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
          })

          if (existingCustomers.data.length > 0) {
            // Use existing customer instead of creating a new one
            stripeId = existingCustomers.data[0].id
            console.log(`Using existing Stripe customer for email ${userEmail}`)
          }
        }

        // Create new customer only if no existing customer was found
        if (!stripeId) {
          const customer = await createCustomer(firebaseUser)
          stripeId = customer?.id
          console.log(`Created new Stripe customer for user ${userId}`)
        }

        // Update the user record with the Stripe ID
        await db.doc(userPath).update({
          stripeId,
        })
      } catch (error) {
        console.error("Error in newStripeCustomer:", error)
        throw new HttpsError("internal", "Failed to create or link Stripe customer")
      }
    })


export const createPaymentIntent = onCallv2(
  { secrets: [functionsConfigExportSecretName] },
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
        const newCart = await db.collection(`users/${userId}/paymentcart`).add({
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          created_At: paymentIntent.created,
          lastPaymentAttempt: new Date().getUTCDate(),
        })
        cartId = newCart.id
        clientSecret = paymentIntent.client_secret || "" // or is null
      } else {
        // retrieve the paymentIntent where already Created
        const cartData = await db.doc(`users/${userId}/paymentcart/${cartId}`).get()
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
  { secrets: [functionsConfigExportSecretName] },
  async (req) => {
    try {
      // 1. Get user data and validate
      const userId = req?.auth?.uid
      if (!userId) {
        throw new HttpsError("unauthenticated", "User must be authenticated")
      }

      const userDoc = await db.doc(`users/${userId}`).get()
      const user = userDoc.data()
      if (!user || !user.stripeId) {
        throw new HttpsError("not-found", "User or Stripe customer not found")
      }

      // 2. Extract and validate required data
      const { price, paymentMethod, currency } = req.data
      if (!price || !paymentMethod || !currency) {
        throw new HttpsError("invalid-argument", "Missing required payment information")
      }

      // 3. Check for existing subscription
      if (user.subscriptionId) {
        // Option 1: Return existing subscription
        // return { message: "User already has an active subscription", subscriptionId: user.subscriptionId }

        // Option 2: Update existing subscription
        const updatedSub = await stripe.subscriptions.update(user.subscriptionId, {
          items: [{ id: user.itemId, price }],
          // Add other parameters as needed
        })

        // Update the user document with new information
        await db.doc(`users/${userId}`).update({
          status: updatedSub.status,
          itemId: updatedSub.items.data[0].id,
        })

        return { message: "Subscription updated", subscriptionId: updatedSub.id }
      }

      // 4. Check for existing payment methods (PaymentMethods API)
      const paymentMethodsList = await stripe.paymentMethods.list({
        customer: user.stripeId,
        type: "card",
        limit: 100,
      })
      let paymentMethodExists = false
      for (const pm of paymentMethodsList.data) {
        if (pm.id === paymentMethod) {
          paymentMethodExists = true
          break
        }
      }
      // Attach payment method if not already attached
      if (!paymentMethodExists) {
        await stripe.paymentMethods.attach(paymentMethod, { customer: user.stripeId })
      }

      // 5. Set as default payment method for invoices
      await stripe.customers.update(user.stripeId, {
        invoice_settings: { default_payment_method: paymentMethod },
      })

      // 6. Create subscription with idempotency key and default payment method
      const sub = await stripe.subscriptions.create({
        customer: user.stripeId,
        items: [{ price }],
        default_payment_method: paymentMethod,
        currency,
      }, {
        idempotencyKey: `sub_${userId}_${price}`,
      })

      // 7. Update user document
      await db.doc(`users/${userId}`).update({
        status: sub.status,
        currentUsage: 0,
        subscriptionId: sub.id,
        itemId: sub.items.data[0].id,
      })

      return { message: "Subscription created successfully", subscriptionId: sub.id }
    } catch (error) {
      console.error("Error in startSubscription:", error)
      throw new HttpsError("internal", "Failed to start subscription")
    }
  }
)

export const updateUsage = functionsV1
  .runWith({ secrets: [functionsConfigExportSecretName] })
  .firestore
  .database(dbName)
  .document("projects/{projectId}")
  .onCreate(async (snap: QueryDocumentSnapshot) => {
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

