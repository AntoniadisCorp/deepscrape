/* eslint-disable object-curly-spacing */
/* eslint-disable max-len */
import {FieldValue} from "firebase-admin/firestore"
import {db} from "./config"
import {BillingSnapshot, CreditBucket, getCreditAmounts} from "../domain"

export type BillingCreditOperation =
  "grant" |
  "reserve" |
  "consume" |
  "release" |
  "adjust"

export type BillingCreditMetadata = {
  source: string
  operation: BillingCreditOperation
  reason?: string | null
  grantedBy?: string | null
  sessionId?: string | null
  paymentIntentId?: string | null
  invoiceId?: string | null
  subscriptionId?: string | null
  plan?: string | null
  interval?: string | null
  idempotencyKey?: string | null
  createdAt?: FirebaseFirestore.FieldValue
  metadata?: Record<string, unknown>
}

export type BillingCreditMutationArgs = {
  uid: string
  bucket: CreditBucket
  balanceDelta?: number
  reservedDelta?: number
  ledger: BillingCreditMetadata
}

export type BillingCreditMutationResult = {
  bucket: CreditBucket
  balance: number
  reserved: number
  available: number
  ledgerId: string
}

const normalizeWholeNumber = (value: number | undefined): number => {
  const normalized = Math.floor(Number(value || 0))
  return Number.isFinite(normalized) ? normalized : 0
}

const buildLedgerDocId = (raw: string): string =>
  raw.replace(/[\\/#?\]]/g, "_").replace(/\[/g, "_")

const getLedgerRef = (uid: string, idempotencyKey?: string | null) => {
  const collection = db.collection(`users/${uid}/credits_ledger`)
  return idempotencyKey ?
    collection.doc(buildLedgerDocId(idempotencyKey)) :
    collection.doc()
}

const buildCreditsPayload = (
  billing: BillingSnapshot | undefined,
  nextBucket: CreditBucket,
  balance: number,
  reserved: number,
) => {
  const purchased = nextBucket === "purchased" ?
    {balance, reserved} :
    getCreditAmounts(billing, "purchased")
  const included = nextBucket === "included" ?
    {balance, reserved} :
    getCreditAmounts(billing, "included")

  return {
    balance: purchased.balance + included.balance,
    reserved: purchased.reserved + included.reserved,
    purchasedBalance: purchased.balance,
    purchasedReserved: purchased.reserved,
    includedBalance: included.balance,
    includedReserved: included.reserved,
  }
}

export const applyBillingCreditMutation = async (
  args: BillingCreditMutationArgs,
): Promise<BillingCreditMutationResult> => {
  const balanceDelta = normalizeWholeNumber(args.balanceDelta)
  const reservedDelta = normalizeWholeNumber(args.reservedDelta)
  const billingRef = db.doc(`users/${args.uid}/billing/current`)
  const ledgerRef = getLedgerRef(args.uid, args.ledger.idempotencyKey)

  return db.runTransaction(async (transaction) => {
    const [billingSnap, ledgerSnap] = await Promise.all([
      transaction.get(billingRef),
      transaction.get(ledgerRef),
    ])

    const billing = billingSnap.data() as BillingSnapshot | undefined
    const current = getCreditAmounts(billing, args.bucket)

    if (ledgerSnap.exists && args.ledger.idempotencyKey) {
      return {
        bucket: args.bucket,
        balance: current.balance,
        reserved: current.reserved,
        available: Math.max(0, current.balance - current.reserved),
        ledgerId: ledgerRef.id,
      }
    }

    const nextBalance = current.balance + balanceDelta
    const nextReserved = current.reserved + reservedDelta

    if (nextBalance < 0) {
      throw new Error(
        `Billing credit mutation would make ${args.bucket} balance negative`,
      )
    }

    if (nextReserved < 0) {
      throw new Error(
        `Billing credit mutation would make ${args.bucket} reserved credits negative`,
      )
    }

    if (nextReserved > nextBalance) {
      throw new Error(
        `Billing credit mutation would reserve more ${args.bucket} credits than available`,
      )
    }

    transaction.set(billingRef, {
      credits: buildCreditsPayload(
        billing,
        args.bucket,
        nextBalance,
        nextReserved,
      ),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true})

    transaction.set(ledgerRef, {
      source: args.ledger.source,
      operation: args.ledger.operation,
      bucket: args.bucket,
      reason: args.ledger.reason || null,
      grantedBy: args.ledger.grantedBy || null,
      delta: balanceDelta,
      balanceDelta,
      reservedDelta,
      sessionId: args.ledger.sessionId || null,
      paymentIntentId: args.ledger.paymentIntentId || null,
      invoiceId: args.ledger.invoiceId || null,
      subscriptionId: args.ledger.subscriptionId || null,
      plan: args.ledger.plan || null,
      interval: args.ledger.interval || null,
      metadata: args.ledger.metadata || null,
      idempotencyKey: args.ledger.idempotencyKey || null,
      createdAt: args.ledger.createdAt || FieldValue.serverTimestamp(),
    })

    return {
      bucket: args.bucket,
      balance: nextBalance,
      reserved: nextReserved,
      available: Math.max(0, nextBalance - nextReserved),
      ledgerId: ledgerRef.id,
    }
  })
}

export const grantBillingCredits = async (args: {
  uid: string
  amount: number
  bucket: CreditBucket
  ledger: Omit<BillingCreditMetadata, "operation">
}): Promise<BillingCreditMutationResult | null> => {
  const amount = normalizeWholeNumber(args.amount)
  if (amount <= 0) {
    return null
  }

  return applyBillingCreditMutation({
    uid: args.uid,
    bucket: args.bucket,
    balanceDelta: amount,
    ledger: {
      ...args.ledger,
      operation: "grant",
    },
  })
}

export const reserveBillingCredits = async (args: {
  uid: string
  amount: number
  bucket: CreditBucket
  ledger: Omit<BillingCreditMetadata, "operation">
}): Promise<BillingCreditMutationResult | null> => {
  const amount = normalizeWholeNumber(args.amount)
  if (amount <= 0) {
    return null
  }

  return applyBillingCreditMutation({
    uid: args.uid,
    bucket: args.bucket,
    reservedDelta: amount,
    ledger: {
      ...args.ledger,
      operation: "reserve",
    },
  })
}

export const consumeBillingCredits = async (args: {
  uid: string
  amount: number
  bucket: CreditBucket
  releaseReserved?: boolean
  ledger: Omit<BillingCreditMetadata, "operation">
}): Promise<BillingCreditMutationResult | null> => {
  const amount = normalizeWholeNumber(args.amount)
  if (amount <= 0) {
    return null
  }

  return applyBillingCreditMutation({
    uid: args.uid,
    bucket: args.bucket,
    balanceDelta: -amount,
    reservedDelta: args.releaseReserved === false ? 0 : -amount,
    ledger: {
      ...args.ledger,
      operation: "consume",
    },
  })
}

export const releaseBillingCredits = async (args: {
  uid: string
  amount: number
  bucket: CreditBucket
  ledger: Omit<BillingCreditMetadata, "operation">
}): Promise<BillingCreditMutationResult | null> => {
  const amount = normalizeWholeNumber(args.amount)
  if (amount <= 0) {
    return null
  }

  return applyBillingCreditMutation({
    uid: args.uid,
    bucket: args.bucket,
    reservedDelta: -amount,
    ledger: {
      ...args.ledger,
      operation: "release",
    },
  })
}
