import { Injectable } from '@angular/core';
import {
  Auth, AuthProvider, authState, FacebookAuthProvider,
  GoogleAuthProvider, linkWithPopup, signInWithEmailAndPassword,
  signInWithPopup,
  User
} from '@angular/fire/auth';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/internal/operators/map';
import { Subscription } from 'rxjs/internal/Subscription';
import { FireUser } from '../types';
@Injectable({
  providedIn: 'root'
})
export class AuthService {


  token: string | undefined

  user: FireUser

  private userSubs: Subscription
  private authSubs: Subscription

  constructor(private auth: Auth) {
    this.initializeAuth()
  }

  async initializeAuth() {
    await this.initAuth();
  }

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

  /**
   * TODO: comment initAuth
   * @description Inits auth
   */
  async initAuth() {

    this.authSubs = authState(this.auth).subscribe(async user => {

      try {
        if (user) {
          const token = await user.getIdToken()
          this.user = this.getUser(user) as FireUser
          this.token = token || undefined
        } else {
          this.token = undefined;
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        this.token = undefined;
      }
    })


  }

  getUser(user: User): FireUser {

    const { uid, email, displayName, phoneNumber, photoURL, providerId, providerData, emailVerified } = user
    return { uid, displayName, email, photoURL, phoneNumber, providerId, providerData, emailVerified }
  }

  isAuthenticated(): Observable<boolean> {

    return authState(this.auth).pipe(map(user => !!user))
  }

  ngOnDestroy() {
    this.authSubs?.unsubscribe()
    this.userSubs?.unsubscribe()
  }
}
