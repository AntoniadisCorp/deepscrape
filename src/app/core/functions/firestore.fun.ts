import { writeBatch, collection, Firestore, setDoc, deleteDoc, doc, getDoc } from "@angular/fire/firestore";
import { User } from "@angular/fire/auth";
import { BrowserProfile, CrawlConfig, FlyMachine, Users } from "../types";
import { MACHNINE_STATE } from "../enum";

export async function storeUserData(user: User, firestore: Firestore) {
    try {
        const userRef = doc(firestore, 'users', user.uid)
        // const userRefProvider = doc(firestore, `users/${user.uid}`, 'provider')
        let dbuser: Users = {
            uid: user.uid,
            providerParent: user.providerId,
            providerId: user.providerData[0].providerId,
            providerData: user.providerData,
            emailVerified: user.emailVerified,
            created_At: new Date(user.metadata.creationTime || ''),
            last_login_at: new Date(user.metadata.lastSignInTime || ''),
        }

        await setDoc(userRef, dbuser, { merge: true })

        console.log('User data stored successfully.');
    } catch (error) {
        console.error('Error storing user data:', error);
    }
}

export function getErrorMessage(error: any): string {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'Email address is already in use.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/weak-password':
            return 'Password is too weak.';
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with a different login method.';
        default:
            return error.message || 'An error occurred during signup.';
    }
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
        const batchRef = writeBatch(firestore);

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
        console.error('Error storing operation data:', error);
        throw new Error(error as string)
    }
}

export async function deleteOperationDoc(userId: string, operationId: string, firestore: Firestore) {

    try {

        // Create a reference to the "operations" subcollection of the user document
        const operationRef = doc(firestore, `users/${userId}/operations`, operationId)
        const operationMetricsRef = doc(firestore, `operation_metrics`, operationId)

        // Create a batch to group the operations
        const batchRef = writeBatch(firestore);

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


export async function storeBrowserProfile(userId: string, profile: BrowserProfile, firestore: Firestore) {
    try {

        // Ensure unique ID
        const browserRef = doc(collection(firestore, `users/${userId}/browser`))

        // add the user id to the profile
        profile.uid = userId

        // Store the profile data in Firestore
        await setDoc(browserRef, profile)

        console.log('Browser profile data stored successfully in Firestore.')

    } catch (error) {
        console.error('Error storing user browser profile data:', error)
    }

}


export async function storeCrawlConfig(userId: string, config: CrawlConfig, firestore: Firestore) {
    try {

        // Ensure unique ID
        const configRef = doc(collection(firestore, `users/${userId}/crawlconfigs`))

        // add the user id to the profile
        config.uid = userId

        // Store the profile data in Firestore
        await setDoc(configRef, config)

        console.log('Crawl config data stored successfully in Firestore.')

    } catch (error) {
        console.error('Error storing Crawl config data:', error)
    }
}
export async function storeCrawlResultsConfig(userId: string, config: any, firestore: Firestore) {
    try {

        // Ensure unique ID
        const configRef = doc(collection(firestore, `users/${userId}/crawlresultsconfig`))

        // add the user id to the profile
        config.uid = userId

        // Store the profile data in Firestore
        await setDoc(configRef, config)

        console.log('CrawlResult config data stored successfully in Firestore.')

    } catch (error) {
        console.error('Error storing Crawl config data:', error)
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
