import { writeBatch, collection, Firestore, setDoc, deleteDoc, doc, getDoc } from "@angular/fire/firestore"

import { User, AuthError, AuthErrorCodes } from "@angular/fire/auth"
import { BrowserProfile, CrawlConfig, FlyMachine, Users } from "../types"
import { MACHNINE_STATE } from "../enum"

export function getErrorMessage(error: any): string {
    const errorMessage: string = error?.code || error?.message || '';

    switch (errorMessage) {
        case 'auth/email-already-in-use':
            return 'Email address is already in use.';
        case 'auth/cancelled-popup-request':
            return 'Popup request was cancelled. Please try again.';
        case 'auth/popup-closed-by-user':
            return 'Popup was closed by the user. Please try again.';
        case 'auth/popup-blocked':
            return 'Popup was blocked by the browser. Please allow popups for this site.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/too-many-requests':
            return 'Too many reset attempts. Please try again later.';
        case 'auth/weak-password':
            return 'Password is too weak.';
        case 'auth/user-not-found':
            return 'User not found with the provided credentials.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/missing-Email':
            return 'Missing email.';
        case 'auth/account-exists-with-different-credential':
            return 'An account with this email already exists. Please sign in with your existing account to link it.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/invalid-credential':
            return 'Invalid credentials provided.';
        case 'auth/operation-not-supported-in-this-environment':
            return 'This operation is not supported in the current environment.';
        case 'auth/invalid-verification-code':
            return 'Invalid verification code.';
        case 'auth/argument-error':
            return 'Invalid argument provided.';
        case 'auth/provider-already-linked':
            return 'This provider is already linked to the user.';
        case 'auth/invalid-phone-number':
            return 'Invalid phone number format.';
        case AuthErrorCodes.INVALID_ORIGIN:
            return 'This domain is not authorized for OAuth operations.';
        case 'auth/no-such-provider':
            return 'No such provider is linked to the user.';
        default:
            return errorMessage || 'An error occurred during signup.';
    }
}

export function toDate(timestamp?: any): Date | null {
    if (!timestamp) return new Date();

    if (timestamp instanceof Date) return timestamp;

    if (timestamp._seconds !== undefined) {
        return new Date(((timestamp as any)._seconds * 1000) + ((timestamp as any)._nanoseconds / 1e6)) // Handle Firestore Timestamp
    }

    if (typeof timestamp === 'number' || typeof timestamp === 'string') {
        const parsedDate = new Date(timestamp);
        return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }

    return null;
}

// Utility to create a compound session key
export function createSessionKey(ip: string, deviceType: string, providerId: string, browser: string, os: string, location: string): string {
  return `${ip}|${location}|${deviceType}|${os}|${browser}|${providerId}`
}



/* Firestore Crawl Operation */
export async function storeCrawlOperation(userId: string, operationData: any, firestore: Firestore): Promise<boolean> {
    try {
        const { metadata } = operationData

        // Create a reference to the "metadata" collection
        const metadataRef = metadata && (metadata?.crawler || metadata?.browser) ?
            doc(collection(firestore, `users/${userId}/crawlconfigs`)) : null

        // Create a reference to the "operations" subcollection of the user document
        const operationsRef = doc(collection(firestore, `users/${userId}/operations`))

        // Create a batch to group the operations
        const batchRef = writeBatch(firestore)

        if (metadataRef) {

            const meta_data = {
                ...metadata,
                created_At: Date.now(),
                uid: userId,
            }

            batchRef.set(metadataRef, meta_data)
        }

        // Add a new operation document to the subcollection
        batchRef.set(operationsRef, { ...operationData, metadataId: metadataRef?.id || null })

        // FIXME:  If the client is offline, the write fails. If you would like to see 
        // local modifications or buffer writes until the client is online, use the full Firestore SDK.

        // Commit the batch
        await batchRef.commit()

        console.log('Operation data stored successfully.')
        return true
    } catch (error) {
        console.error('Error storing operation data:', error)
        throw new Error(error as string)
    }
}

export async function deleteOperationDoc(userId: string, operationId: string, firestore: Firestore) {

    try {

        // Create a reference to the "operations" subcollection of the user document
        const operationRef = doc(firestore, `users/${userId}/operations`, operationId)
        const operationMetricsRef = doc(firestore, `operation_metrics`, operationId)

        // Create a batch to group the operations
        const batchRef = writeBatch(firestore)

        // Update the document with the soft delete flag and timestamp
        batchRef.set(operationMetricsRef, { deleted_At: Date.now(), softDelete: true }, { merge: true })

        // Delete the document
        batchRef.delete(operationRef)

        // Commit the batch
        await batchRef.commit()

        console.log("Document deleted successfully")
        return true
    } catch (error) {
        console.error("Error deleting document: ", error)
        throw new Error(error as string)
    }


}

export async function updateMachineState(userId: string, machine: FlyMachine, state: MACHNINE_STATE, firestore: Firestore) {

    try {
        const userRef = doc(firestore, 'users', userId)


        const newMachine: FlyMachine = {
            ...machine,
            state,
            updated_at: new Date().toISOString(),
        }

        await setDoc(userRef, newMachine, { merge: true })

    } catch (error) {
        console.error('Error updating machine state:', error)
    }
}
