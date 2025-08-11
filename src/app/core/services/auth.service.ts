import { Injectable } from '@angular/core';
import {
  Auth, AuthProvider, authState, browserLocalPersistence, connectAuthEmulator, FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider, indexedDBLocalPersistence, linkWithPopup, setPersistence, signInWithEmailAndPassword,
  signInWithPopup,
  User
} from '@angular/fire/auth';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/internal/operators/map';
import { Subscription } from 'rxjs/internal/Subscription';
import { FireUser } from '../types';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { FirestoreService } from './firestore.service'
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {


  token: string | undefined = ''

  private authStateResolved = new BehaviorSubject<boolean>(false);
  user: FireUser | null = null;

  private userSubs: Subscription
  private authSubs: Subscription

  constructor(private auth: Auth, private fireService: FirestoreService) {
    this.initAuth()
  }

  isAuthenticated(): Observable<boolean> {
    return this.fireService.authState()
  }

  get isAuthStateResolved() {
    return this.authStateResolved.asObservable();
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

    if (this.fireService.isLocalhost() || !environment.production) {
      // Connect to Firebase Emulators if running on localhost and not in production
      console.log('🔥 Connecting Auth Service to Firebase Emulators');
      connectAuthEmulator(this.auth, 'http://localhost:9099');
    }

    this.auth.onAuthStateChanged({
      next: async user => {

        if (!user) {
          this.user = null;
          this.token = undefined;
          this.authStateResolved.next(false)
          return
        }

        this.user = user;
        this.authStateResolved.next(true)

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
      },
      error: (error) => {
        console.error('Error in auth state change:', error);
      },
      complete: () => {
        console.log('Auth state change completed.');
      }
    })
  }

  getUser(user: User): FireUser {

    const { uid, email, displayName, phoneNumber, photoURL, providerId, providerData, emailVerified } = user
    return { uid, displayName, email, photoURL, phoneNumber, providerId, providerData, emailVerified }
  }

  ngOnDestroy() {
    this.authSubs?.unsubscribe()
    this.userSubs?.unsubscribe()
  }
}
