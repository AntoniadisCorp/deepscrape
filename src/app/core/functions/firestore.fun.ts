import { writeBatch, collection, Firestore, setDoc, deleteDoc, doc, getDoc } from "@angular/fire/firestore"

import { User, AuthError, AuthErrorCodes } from "@angular/fire/auth";
import { BrowserProfile, CrawlConfig, FlyMachine, Users } from "../types";
import { MACHNINE_STATE } from "../enum";
import { TranslateService } from "@ngx-translate/core";

export function getErrorMessage(error: any, translate: TranslateService): string {
    const errorMessage: string = error?.code || error?.message || '';

    switch (errorMessage) {
        case AuthErrorCodes.EMAIL_EXISTS:
            return translate.instant('AUTH_ERRORS.EMAIL_EXISTS');
        case AuthErrorCodes.EXPIRED_POPUP_REQUEST:
            return translate.instant('AUTH_ERRORS.EXPIRED_POPUP_REQUEST');
        case AuthErrorCodes.POPUP_CLOSED_BY_USER:
            return translate.instant('AUTH_ERRORS.POPUP_CLOSED_BY_USER');
        case AuthErrorCodes.POPUP_BLOCKED:
            return translate.instant('AUTH_ERRORS.POPUP_BLOCKED');
        case AuthErrorCodes.INVALID_EMAIL:
            return translate.instant('AUTH_ERRORS.INVALID_EMAIL');
        case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
            return translate.instant('AUTH_ERRORS.TOO_MANY_ATTEMPTS_TRY_LATER');
        case AuthErrorCodes.WEAK_PASSWORD:
            return translate.instant('AUTH_ERRORS.WEAK_PASSWORD');
        case AuthErrorCodes.USER_DELETED:
            return translate.instant('AUTH_ERRORS.USER_DELETED');
        case AuthErrorCodes.INVALID_PASSWORD:
            return translate.instant('AUTH_ERRORS.INVALID_PASSWORD');
        case 'auth/missing-Email':
            return translate.instant('AUTH_ERRORS.MISSING_EMAIL');
        case AuthErrorCodes.NEED_CONFIRMATION:
            return translate.instant('AUTH_ERRORS.NEED_CONFIRMATION');
        case AuthErrorCodes.NETWORK_REQUEST_FAILED:
            return translate.instant('AUTH_ERRORS.NETWORK_REQUEST_FAILED');
        case AuthErrorCodes.INVALID_IDP_RESPONSE:
        case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
            return translate.instant('AUTH_ERRORS.INVALID_LOGIN_CREDENTIALS');
        case AuthErrorCodes.OPERATION_NOT_SUPPORTED:
            return translate.instant('AUTH_ERRORS.OPERATION_NOT_SUPPORTED');
        case AuthErrorCodes.INVALID_CODE:
            return translate.instant('AUTH_ERRORS.INVALID_CODE');
        case AuthErrorCodes.ARGUMENT_ERROR:
            return translate.instant('AUTH_ERRORS.ARGUMENT_ERROR');
        case AuthErrorCodes.PROVIDER_ALREADY_LINKED:
            return translate.instant('AUTH_ERRORS.PROVIDER_ALREADY_LINKED');
        case AuthErrorCodes.INVALID_PHONE_NUMBER:
            return translate.instant('AUTH_ERRORS.INVALID_PHONE_NUMBER');
        case AuthErrorCodes.INVALID_ORIGIN:
            return translate.instant('AUTH_ERRORS.INVALID_ORIGIN');
        case AuthErrorCodes.NO_SUCH_PROVIDER:
            return translate.instant('AUTH_ERRORS.NO_SUCH_PROVIDER');
        // --- BEGIN: ALL FIREBASE AUTH ERROR CODES ---
        case AuthErrorCodes.ADMIN_ONLY_OPERATION:
            return translate.instant('AUTH_ERRORS.ADMIN_ONLY_OPERATION');
        case AuthErrorCodes.APP_NOT_AUTHORIZED:
            return translate.instant('AUTH_ERRORS.APP_NOT_AUTHORIZED');
        case AuthErrorCodes.APP_NOT_INSTALLED:
            return translate.instant('AUTH_ERRORS.APP_NOT_INSTALLED');
        case AuthErrorCodes.CAPTCHA_CHECK_FAILED:
            return translate.instant('AUTH_ERRORS.CAPTCHA_CHECK_FAILED');
        case AuthErrorCodes.CODE_EXPIRED:
            return translate.instant('AUTH_ERRORS.CODE_EXPIRED');
        case AuthErrorCodes.CORDOVA_NOT_READY:
            return translate.instant('AUTH_ERRORS.CORDOVA_NOT_READY');
        case AuthErrorCodes.CORS_UNSUPPORTED:
            return translate.instant('AUTH_ERRORS.CORS_UNSUPPORTED');
        case AuthErrorCodes.CREDENTIAL_ALREADY_IN_USE:
            return translate.instant('AUTH_ERRORS.CREDENTIAL_ALREADY_IN_USE');
        case AuthErrorCodes.CREDENTIAL_MISMATCH:
            return translate.instant('AUTH_ERRORS.CREDENTIAL_MISMATCH');
        case AuthErrorCodes.CREDENTIAL_TOO_OLD_LOGIN_AGAIN:
            return translate.instant('AUTH_ERRORS.CREDENTIAL_TOO_OLD_LOGIN_AGAIN');
        case AuthErrorCodes.DEPENDENT_SDK_INIT_BEFORE_AUTH:
            return translate.instant('AUTH_ERRORS.DEPENDENT_SDK_INIT_BEFORE_AUTH');
        case AuthErrorCodes.DYNAMIC_LINK_NOT_ACTIVATED:
            return translate.instant('AUTH_ERRORS.DYNAMIC_LINK_NOT_ACTIVATED');
        case AuthErrorCodes.EMAIL_CHANGE_NEEDS_VERIFICATION:
            return translate.instant('AUTH_ERRORS.EMAIL_CHANGE_NEEDS_VERIFICATION');
        case AuthErrorCodes.EMULATOR_CONFIG_FAILED:
            return translate.instant('AUTH_ERRORS.EMULATOR_CONFIG_FAILED');
        case AuthErrorCodes.EXPIRED_OOB_CODE:
            return translate.instant('AUTH_ERRORS.EXPIRED_OOB_CODE');
        case AuthErrorCodes.INTERNAL_ERROR:
            return translate.instant('AUTH_ERRORS.INTERNAL_ERROR');
        case AuthErrorCodes.INVALID_API_KEY:
            return translate.instant('AUTH_ERRORS.INVALID_API_KEY');
        case AuthErrorCodes.INVALID_APP_CREDENTIAL:
            return translate.instant('AUTH_ERRORS.INVALID_APP_CREDENTIAL');
        case AuthErrorCodes.INVALID_APP_ID:
            return translate.instant('AUTH_ERRORS.INVALID_APP_ID');
        case AuthErrorCodes.INVALID_AUTH:
            return translate.instant('AUTH_ERRORS.INVALID_AUTH');
        case AuthErrorCodes.INVALID_AUTH_EVENT:
            return translate.instant('AUTH_ERRORS.INVALID_AUTH_EVENT');
        case AuthErrorCodes.INVALID_CERT_HASH:
            return translate.instant('AUTH_ERRORS.INVALID_CERT_HASH');
        case AuthErrorCodes.INVALID_CONTINUE_URI:
            return translate.instant('AUTH_ERRORS.INVALID_CONTINUE_URI');
        case AuthErrorCodes.INVALID_CORDOVA_CONFIGURATION:
            return translate.instant('AUTH_ERRORS.INVALID_CORDOVA_CONFIGURATION');
        case AuthErrorCodes.INVALID_CUSTOM_TOKEN:
            return translate.instant('AUTH_ERRORS.INVALID_CUSTOM_TOKEN');
        case AuthErrorCodes.INVALID_DYNAMIC_LINK_DOMAIN:
            return translate.instant('AUTH_ERRORS.INVALID_DYNAMIC_LINK_DOMAIN');
        case AuthErrorCodes.INVALID_EMULATOR_SCHEME:
            return translate.instant('AUTH_ERRORS.INVALID_EMULATOR_SCHEME');
        case AuthErrorCodes.INVALID_MESSAGE_PAYLOAD:
            return translate.instant('AUTH_ERRORS.INVALID_MESSAGE_PAYLOAD');
        case AuthErrorCodes.INVALID_MFA_SESSION:
            return translate.instant('AUTH_ERRORS.INVALID_MFA_SESSION');
        case AuthErrorCodes.INVALID_OAUTH_CLIENT_ID:
            return translate.instant('AUTH_ERRORS.INVALID_OAUTH_CLIENT_ID');
        case AuthErrorCodes.INVALID_OAUTH_PROVIDER:
            return translate.instant('AUTH_ERRORS.INVALID_OAUTH_PROVIDER');
        case AuthErrorCodes.INVALID_OOB_CODE:
            return translate.instant('AUTH_ERRORS.INVALID_OOB_CODE');
        case AuthErrorCodes.UNAUTHORIZED_DOMAIN:
            return translate.instant('AUTH_ERRORS.UNAUTHORIZED_DOMAIN');
        case AuthErrorCodes.INVALID_PERSISTENCE:
            return translate.instant('AUTH_ERRORS.INVALID_PERSISTENCE');
        case AuthErrorCodes.INVALID_PROVIDER_ID:
            return translate.instant('AUTH_ERRORS.INVALID_PROVIDER_ID');
        case AuthErrorCodes.INVALID_RECIPIENT_EMAIL:
            return translate.instant('AUTH_ERRORS.INVALID_RECIPIENT_EMAIL');
        case AuthErrorCodes.INVALID_SENDER:
            return translate.instant('AUTH_ERRORS.INVALID_SENDER');
        case AuthErrorCodes.INVALID_SESSION_INFO:
            return translate.instant('AUTH_ERRORS.INVALID_SESSION_INFO');
        case AuthErrorCodes.INVALID_TENANT_ID:
            return translate.instant('AUTH_ERRORS.INVALID_TENANT_ID');
        case AuthErrorCodes.MFA_INFO_NOT_FOUND:
            return translate.instant('AUTH_ERRORS.MFA_INFO_NOT_FOUND');
        case AuthErrorCodes.MFA_REQUIRED:
            return translate.instant('AUTH_ERRORS.MFA_REQUIRED');
        case AuthErrorCodes.MISSING_ANDROID_PACKAGE_NAME:
            return translate.instant('AUTH_ERRORS.MISSING_ANDROID_PACKAGE_NAME');
        case AuthErrorCodes.MISSING_APP_CREDENTIAL:
            return translate.instant('AUTH_ERRORS.MISSING_APP_CREDENTIAL');
        case AuthErrorCodes.MISSING_AUTH_DOMAIN:
            return translate.instant('AUTH_ERRORS.MISSING_AUTH_DOMAIN');
        case AuthErrorCodes.MISSING_CODE:
            return translate.instant('AUTH_ERRORS.MISSING_CODE');
        case AuthErrorCodes.MISSING_CONTINUE_URI:
            return translate.instant('AUTH_ERRORS.MISSING_CONTINUE_URI');
        case AuthErrorCodes.MISSING_IFRAME_START:
            return translate.instant('AUTH_ERRORS.MISSING_IFRAME_START');
        case AuthErrorCodes.MISSING_IOS_BUNDLE_ID:
            return translate.instant('AUTH_ERRORS.MISSING_IOS_BUNDLE_ID');
        case AuthErrorCodes.MISSING_OR_INVALID_NONCE:
            return translate.instant('AUTH_ERRORS.MISSING_OR_INVALID_NONCE');
        case AuthErrorCodes.MISSING_MFA_INFO:
            return translate.instant('AUTH_ERRORS.MISSING_MFA_INFO');
        case AuthErrorCodes.MISSING_MFA_SESSION:
            return translate.instant('AUTH_ERRORS.MISSING_MFA_SESSION');
        case AuthErrorCodes.MISSING_PHONE_NUMBER:
            return translate.instant('AUTH_ERRORS.MISSING_PHONE_NUMBER');
        case AuthErrorCodes.MISSING_SESSION_INFO:
            return translate.instant('AUTH_ERRORS.MISSING_SESSION_INFO');
        case AuthErrorCodes.MODULE_DESTROYED:
            return translate.instant('AUTH_ERRORS.MODULE_DESTROYED');
        case AuthErrorCodes.NO_AUTH_EVENT:
            return translate.instant('AUTH_ERRORS.NO_AUTH_EVENT');
        case AuthErrorCodes.OPERATION_NOT_ALLOWED:
            return translate.instant('AUTH_ERRORS.OPERATION_NOT_ALLOWED');
        case AuthErrorCodes.QUOTA_EXCEEDED:
            return translate.instant('AUTH_ERRORS.QUOTA_EXCEEDED');
        case AuthErrorCodes.REDIRECT_CANCELLED_BY_USER:
            return translate.instant('AUTH_ERRORS.REDIRECT_CANCELLED_BY_USER');
        case AuthErrorCodes.REDIRECT_OPERATION_PENDING:
            return translate.instant('AUTH_ERRORS.REDIRECT_OPERATION_PENDING');
        case AuthErrorCodes.REJECTED_CREDENTIAL:
            return translate.instant('AUTH_ERRORS.REJECTED_CREDENTIAL');
        case AuthErrorCodes.SECOND_FACTOR_ALREADY_ENROLLED:
            return translate.instant('AUTH_ERRORS.SECOND_FACTOR_ALREADY_ENROLLED');
        case AuthErrorCodes.SECOND_FACTOR_LIMIT_EXCEEDED:
            return translate.instant('AUTH_ERRORS.SECOND_FACTOR_LIMIT_EXCEEDED');
        case AuthErrorCodes.TENANT_ID_MISMATCH:
            return translate.instant('AUTH_ERRORS.TENANT_ID_MISMATCH');
        case AuthErrorCodes.TIMEOUT:
            return translate.instant('AUTH_ERRORS.TIMEOUT');
        case AuthErrorCodes.TOKEN_EXPIRED:
            return translate.instant('AUTH_ERRORS.TOKEN_EXPIRED');
        case AuthErrorCodes.UNAUTHORIZED_DOMAIN:
            return translate.instant('AUTH_ERRORS.UNAUTHORIZED_DOMAIN');
        case AuthErrorCodes.UNSUPPORTED_FIRST_FACTOR:
            return translate.instant('AUTH_ERRORS.UNSUPPORTED_FIRST_FACTOR');
        case AuthErrorCodes.UNSUPPORTED_PERSISTENCE:
            return translate.instant('AUTH_ERRORS.UNSUPPORTED_PERSISTENCE');
        case AuthErrorCodes.UNSUPPORTED_TENANT_OPERATION:
            return translate.instant('AUTH_ERRORS.UNSUPPORTED_TENANT_OPERATION');
        case AuthErrorCodes.UNVERIFIED_EMAIL:
            return translate.instant('AUTH_ERRORS.UNVERIFIED_EMAIL');
        case AuthErrorCodes.USER_CANCELLED:
            return translate.instant('AUTH_ERRORS.USER_CANCELLED');
        case AuthErrorCodes.USER_DISABLED:
            return translate.instant('AUTH_ERRORS.USER_DISABLED');
        case AuthErrorCodes.USER_MISMATCH:
            return translate.instant('AUTH_ERRORS.USER_MISMATCH');
        case AuthErrorCodes.USER_SIGNED_OUT:
            return translate.instant('AUTH_ERRORS.USER_SIGNED_OUT');
        case AuthErrorCodes.WEB_STORAGE_UNSUPPORTED:
            return translate.instant('AUTH_ERRORS.WEB_STORAGE_UNSUPPORTED');
        case AuthErrorCodes.ALREADY_INITIALIZED:
            return translate.instant('AUTH_ERRORS.ALREADY_INITIALIZED');
        case AuthErrorCodes.RECAPTCHA_NOT_ENABLED:
            return translate.instant('AUTH_ERRORS.RECAPTCHA_NOT_ENABLED');
        case AuthErrorCodes.MISSING_RECAPTCHA_TOKEN:
            return translate.instant('AUTH_ERRORS.MISSING_RECAPTCHA_TOKEN');
        case AuthErrorCodes.INVALID_RECAPTCHA_TOKEN:
            return translate.instant('AUTH_ERRORS.INVALID_RECAPTCHA_TOKEN');
        case AuthErrorCodes.INVALID_RECAPTCHA_ACTION:
            return translate.instant('AUTH_ERRORS.INVALID_RECAPTCHA_ACTION');
        case AuthErrorCodes.MISSING_CLIENT_TYPE:
            return translate.instant('AUTH_ERRORS.MISSING_CLIENT_TYPE');
        case AuthErrorCodes.MISSING_RECAPTCHA_VERSION:
            return translate.instant('AUTH_ERRORS.MISSING_RECAPTCHA_VERSION');
        case AuthErrorCodes.INVALID_RECAPTCHA_VERSION:
            return translate.instant('AUTH_ERRORS.INVALID_RECAPTCHA_VERSION');
        case AuthErrorCodes.INVALID_REQ_TYPE:
            return translate.instant('AUTH_ERRORS.INVALID_REQ_TYPE');
        case AuthErrorCodes.INVALID_HOSTING_LINK_DOMAIN:
            return translate.instant('AUTH_ERRORS.INVALID_HOSTING_LINK_DOMAIN');
        // --- END: ALL FIREBASE AUTH ERROR CODES ---
        default:
            return translate.instant('AUTH_ERRORS.UNKNOWN_ERROR');
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
