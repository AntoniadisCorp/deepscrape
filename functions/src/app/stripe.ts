/* eslint-disable require-jsdoc */
// Takes a Firebase user and creates a Stripe customer account
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { stripe } from "./config"
type providerData = {
  email: string
  displayName: string
  providerId: string
  phoneNumber: string | number
  photoURL: string
  uid: string
}

/* TODO: create a Stripe customer account for the user use most usable data */
export async function createCustomer(firebaseUser: any): Promise<any> {
  const providerData = firebaseUser.providerData as providerData[]

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
