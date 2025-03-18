import { Injectable } from '@angular/core';
import { Auth, AuthProvider, authState, FacebookAuthProvider, getAuth, GoogleAuthProvider, linkWithPopup, signInWithEmailAndPassword, signInWithPopup, User } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { catchError, from, map, of, Subscription, take } from 'rxjs';
import { Users } from '../types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  token: string | undefined

  user: { uid?: string, displayName?: string | null } | null

  private userSubs: Subscription

  constructor(private firestore: Firestore, private auth: Auth) {
    this.initAuth()

    this.initUser()
    /*  this.userSubs = from(this.getUser()).pipe(
       take(1),
       map((currentUser) => {
         const { error, user } = currentUser
         if (error) {
           return user
         }
         return { ...user }
       }),
       catchError(error => {
         console.log(error)
         return of(null)
       })
     ).subscribe({
       next: (user) => {
         this.user = user
       },
       error: (error) => {
         console.log(error)
         this.user = null
       }
     }) */
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
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken()
      this.token = token
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  initUser() {
    const { error, user } = this.getUser()
    this.user = user
    if (error) {

      return
    }
  }

  getUser() {

    try {
      const user = this.auth.currentUser;
      if (user) {
        return { error: null, user: { uid: user.uid, displayName: user.displayName } }
      } else {
        throw new Error('No user is currently signed in.');
      }
    } catch (error) {
      return { error, user: null }
    }

  }

  isAuthenticated() {
    return authState(this.auth).pipe(map(user => !!user))
  }

  ngOnDestroy() {
    this.userSubs?.unsubscribe()
  }
}
