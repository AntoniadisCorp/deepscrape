import { doc, Firestore, getDoc, setDoc } from "@angular/fire/firestore";
import { User, UserInfo } from "@angular/fire/auth";
import { Users } from "../types/firestore.interface";

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


export async function getUserData(user: User, firestore: Firestore) {

    const userRef = doc(firestore, 'users', user.uid);
    let err, docSnapshot = await getDoc(userRef)
    if (err) {
        console.error('Error getting user data:', err)
        return null;
    }

    if (docSnapshot.exists()) {
        const data = docSnapshot.data() as Users
        return data
    }

    return null
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