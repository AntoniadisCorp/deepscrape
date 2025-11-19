import { writeBatch, collection, Firestore, setDoc, deleteDoc, doc, getDoc } from "@angular/fire/firestore"

import { User, AuthError, AuthErrorCodes } from "@angular/fire/auth"
import { BrowserProfile, CrawlConfig, FlyMachine, Users } from "../types"
import { MACHNINE_STATE } from "../enum"

export function getErrorMessage(error: any): string {
    const errorMessage: string = error?.code || error?.message || '';

    switch (errorMessage) {
        case AuthErrorCodes.EMAIL_EXISTS:
            return 'Email address is already in use.';
        case AuthErrorCodes.EXPIRED_POPUP_REQUEST:
            return 'Popup request was cancelled. Please try again.';
        case AuthErrorCodes.POPUP_CLOSED_BY_USER:
            return 'Popup was closed by the user. Please try again.';
        case AuthErrorCodes.POPUP_BLOCKED:
            return 'Popup was blocked by the browser. Please allow popups for this site.';
        case AuthErrorCodes.INVALID_EMAIL:
            return 'Invalid email address.';
        case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
            return 'Too many attempts. Please try again later.';
        case AuthErrorCodes.WEAK_PASSWORD:
            return 'Password is too weak.';
        case AuthErrorCodes.USER_DELETED:
            return 'User not found with the provided credentials.';
        case AuthErrorCodes.INVALID_PASSWORD:
            return 'Incorrect password.';
        case 'auth/missing-Email':
            return 'Missing email.';
        case AuthErrorCodes.NEED_CONFIRMATION:
            return 'An account with this email already exists. Please sign in with your existing account to link it.';
        case AuthErrorCodes.NETWORK_REQUEST_FAILED:
            return 'Network error. Please check your internet connection.';
        case AuthErrorCodes.INVALID_IDP_RESPONSE:
        case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
            return 'Invalid credentials provided.';
        case AuthErrorCodes.OPERATION_NOT_SUPPORTED:
            return 'This operation is not supported in the current environment.';
        case AuthErrorCodes.INVALID_CODE:
            return 'Invalid verification code.';
        case AuthErrorCodes.ARGUMENT_ERROR:
            return 'Invalid argument provided.';
        case AuthErrorCodes.PROVIDER_ALREADY_LINKED:
            return 'This provider is already linked to the user.';
        case AuthErrorCodes.INVALID_PHONE_NUMBER:
            return 'Invalid phone number format.';
        case AuthErrorCodes.INVALID_ORIGIN:
            return 'This domain is not authorized for OAuth operations.';
        case AuthErrorCodes.NO_SUCH_PROVIDER:
            return 'No such provider is linked to the user.';
        // --- BEGIN: ALL FIREBASE AUTH ERROR CODES ---
        case AuthErrorCodes.ADMIN_ONLY_OPERATION:
            return 'This operation is restricted to administrators.';
        case AuthErrorCodes.APP_NOT_AUTHORIZED:
            return 'This app is not authorized for authentication.';
        case AuthErrorCodes.APP_NOT_INSTALLED:
            return 'The app is not installed.';
        case AuthErrorCodes.CAPTCHA_CHECK_FAILED:
            return 'Captcha check failed.';
        case AuthErrorCodes.CODE_EXPIRED:
            return 'The code has expired.';
        case AuthErrorCodes.CORDOVA_NOT_READY:
            return 'Cordova is not ready.';
        case AuthErrorCodes.CORS_UNSUPPORTED:
            return 'CORS is not supported by the browser.';
        case AuthErrorCodes.CREDENTIAL_ALREADY_IN_USE:
            return 'This credential is already associated with a different user account.';
        case AuthErrorCodes.CREDENTIAL_MISMATCH:
            return 'Custom token does not match.';
        case AuthErrorCodes.CREDENTIAL_TOO_OLD_LOGIN_AGAIN:
            return 'Please log in again to perform this operation.';
        case AuthErrorCodes.DEPENDENT_SDK_INIT_BEFORE_AUTH:
            return 'A dependent SDK was initialized before Auth.';
        case AuthErrorCodes.DYNAMIC_LINK_NOT_ACTIVATED:
            return 'Dynamic link is not activated.';
        case AuthErrorCodes.EMAIL_CHANGE_NEEDS_VERIFICATION:
            return 'Email change needs verification.';
        case AuthErrorCodes.EMULATOR_CONFIG_FAILED:
            return 'Emulator configuration failed.';
        case AuthErrorCodes.EXPIRED_OOB_CODE:
            return 'The action code has expired.';
        case AuthErrorCodes.INTERNAL_ERROR:
            return 'An internal error occurred.';
        case AuthErrorCodes.INVALID_API_KEY:
            return 'Invalid API key.';
        case AuthErrorCodes.INVALID_APP_CREDENTIAL:
            return 'Invalid app credential.';
        case AuthErrorCodes.INVALID_APP_ID:
            return 'Invalid app ID.';
        case AuthErrorCodes.INVALID_AUTH:
            return 'Invalid user token.';
        case AuthErrorCodes.INVALID_AUTH_EVENT:
            return 'Invalid authentication event.';
        case AuthErrorCodes.INVALID_CERT_HASH:
            return 'Invalid certificate hash.';
        case AuthErrorCodes.INVALID_CONTINUE_URI:
            return 'Invalid continue URI.';
        case AuthErrorCodes.INVALID_CORDOVA_CONFIGURATION:
            return 'Invalid Cordova configuration.';
        case AuthErrorCodes.INVALID_CUSTOM_TOKEN:
            return 'Invalid custom token.';
        case AuthErrorCodes.INVALID_DYNAMIC_LINK_DOMAIN:
            return 'Invalid dynamic link domain.';
        case AuthErrorCodes.INVALID_EMULATOR_SCHEME:
            return 'Invalid emulator scheme.';
        case AuthErrorCodes.INVALID_MESSAGE_PAYLOAD:
            return 'Invalid message payload.';
        case AuthErrorCodes.INVALID_MFA_SESSION:
            return 'Invalid multi-factor session.';
        case AuthErrorCodes.INVALID_OAUTH_CLIENT_ID:
            return 'Invalid OAuth client ID.';
        case AuthErrorCodes.INVALID_OAUTH_PROVIDER:
            return 'Invalid OAuth provider.';
        case AuthErrorCodes.INVALID_OOB_CODE:
            return 'Invalid action code.';
        case AuthErrorCodes.UNAUTHORIZED_DOMAIN:
            return 'This domain is not authorized.';
        case AuthErrorCodes.INVALID_PERSISTENCE:
            return 'Invalid persistence type.';
        case AuthErrorCodes.INVALID_PROVIDER_ID:
            return 'Invalid provider ID.';
        case AuthErrorCodes.INVALID_RECIPIENT_EMAIL:
            return 'Invalid recipient email.';
        case AuthErrorCodes.INVALID_SENDER:
            return 'Invalid sender.';
        case AuthErrorCodes.INVALID_SESSION_INFO:
            return 'Invalid verification ID.';
        case AuthErrorCodes.INVALID_TENANT_ID:
            return 'Invalid tenant ID.';
        case AuthErrorCodes.MFA_INFO_NOT_FOUND:
            return 'Multi-factor info not found.';
        case AuthErrorCodes.MFA_REQUIRED:
            return 'Multi-factor authentication required.';
        case AuthErrorCodes.MISSING_ANDROID_PACKAGE_NAME:
            return 'Missing Android package name.';
        case AuthErrorCodes.MISSING_APP_CREDENTIAL:
            return 'Missing app credential.';
        case AuthErrorCodes.MISSING_AUTH_DOMAIN:
            return 'Auth domain configuration required.';
        case AuthErrorCodes.MISSING_CODE:
            return 'Missing verification code.';
        case AuthErrorCodes.MISSING_CONTINUE_URI:
            return 'Missing continue URI.';
        case AuthErrorCodes.MISSING_IFRAME_START:
            return 'Missing iframe start.';
        case AuthErrorCodes.MISSING_IOS_BUNDLE_ID:
            return 'Missing iOS bundle ID.';
        case AuthErrorCodes.MISSING_OR_INVALID_NONCE:
            return 'Missing or invalid nonce.';
        case AuthErrorCodes.MISSING_MFA_INFO:
            return 'Missing multi-factor info.';
        case AuthErrorCodes.MISSING_MFA_SESSION:
            return 'Missing multi-factor session.';
        case AuthErrorCodes.MISSING_PHONE_NUMBER:
            return 'Missing phone number.';
        case AuthErrorCodes.MISSING_SESSION_INFO:
            return 'Missing verification ID.';
        case AuthErrorCodes.MODULE_DESTROYED:
            return 'The app has been deleted.';
        case AuthErrorCodes.NO_AUTH_EVENT:
            return 'No authentication event.';
        case AuthErrorCodes.OPERATION_NOT_ALLOWED:
            return 'This operation is not allowed.';
        case AuthErrorCodes.QUOTA_EXCEEDED:
            return 'Quota exceeded. Please try again later.';
        case AuthErrorCodes.REDIRECT_CANCELLED_BY_USER:
            return 'Redirect cancelled by user.';
        case AuthErrorCodes.REDIRECT_OPERATION_PENDING:
            return 'A redirect operation is already pending.';
        case AuthErrorCodes.REJECTED_CREDENTIAL:
            return 'Credential was rejected.';
        case AuthErrorCodes.SECOND_FACTOR_ALREADY_ENROLLED:
            return 'Second factor already in use.';
        case AuthErrorCodes.SECOND_FACTOR_LIMIT_EXCEEDED:
            return 'Maximum number of second factors exceeded.';
        case AuthErrorCodes.TENANT_ID_MISMATCH:
            return 'Tenant ID mismatch.';
        case AuthErrorCodes.TIMEOUT:
            return 'Operation timed out.';
        case AuthErrorCodes.TOKEN_EXPIRED:
            return 'User token has expired.';
        case AuthErrorCodes.UNAUTHORIZED_DOMAIN:
            return 'Unauthorized continue URI.';
        case AuthErrorCodes.UNSUPPORTED_FIRST_FACTOR:
            return 'Unsupported first factor.';
        case AuthErrorCodes.UNSUPPORTED_PERSISTENCE:
            return 'Unsupported persistence type.';
        case AuthErrorCodes.UNSUPPORTED_TENANT_OPERATION:
            return 'Unsupported tenant operation.';
        case AuthErrorCodes.UNVERIFIED_EMAIL:
            return 'Email address is not verified.';
        case AuthErrorCodes.USER_CANCELLED:
            return 'User cancelled the operation.';
        case AuthErrorCodes.USER_DISABLED:
            return 'User account is disabled.';
        case AuthErrorCodes.USER_MISMATCH:
            return 'User mismatch.';
        case AuthErrorCodes.USER_SIGNED_OUT:
            return 'User has signed out.';
        case AuthErrorCodes.WEB_STORAGE_UNSUPPORTED:
            return 'Web storage is unsupported.';
        case AuthErrorCodes.ALREADY_INITIALIZED:
            return 'The app is already initialized.';
        case AuthErrorCodes.RECAPTCHA_NOT_ENABLED:
            return 'reCAPTCHA is not enabled.';
        case AuthErrorCodes.MISSING_RECAPTCHA_TOKEN:
            return 'Missing reCAPTCHA token.';
        case AuthErrorCodes.INVALID_RECAPTCHA_TOKEN:
            return 'Invalid reCAPTCHA token.';
        case AuthErrorCodes.INVALID_RECAPTCHA_ACTION:
            return 'Invalid reCAPTCHA action.';
        case AuthErrorCodes.MISSING_CLIENT_TYPE:
            return 'Missing client type.';
        case AuthErrorCodes.MISSING_RECAPTCHA_VERSION:
            return 'Missing reCAPTCHA version.';
        case AuthErrorCodes.INVALID_RECAPTCHA_VERSION:
            return 'Invalid reCAPTCHA version.';
        case AuthErrorCodes.INVALID_REQ_TYPE:
            return 'Invalid request type.';
        case AuthErrorCodes.INVALID_HOSTING_LINK_DOMAIN:
            return 'Invalid hosting link domain.';
        // --- END: ALL FIREBASE AUTH ERROR CODES ---
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
