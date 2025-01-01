import { Injectable } from '@angular/core';
import { Auth, AuthProvider, FacebookAuthProvider, GoogleAuthProvider, linkWithPopup, signInWithEmailAndPassword, signInWithPopup } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private firestore: Firestore, private auth: Auth) { }

  // Sign in with Google
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.auth, provider)
  }

  // Sign in with Facebook
  async signInWithFacebook() {
    const provider = new FacebookAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  // Sign in with Email and Password
  async signInWithEmail(email: string, password: string) {
    return await signInWithEmailAndPassword(this.auth, email, password);
  }

  // Link additional provider to existing account
  async linkProvider(provider: AuthProvider) {
    const user = await this.auth.currentUser;
    if (user) {
      return await linkWithPopup(user, provider)
    } else {
      throw new Error('No user is currently signed in.');
    }
  }
}
