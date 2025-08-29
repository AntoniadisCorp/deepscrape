import { Injectable } from '@angular/core';
import {
  Auth, AuthProvider, authState, browserLocalPersistence, connectAuthEmulator, FacebookAuthProvider,
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider, indexedDBLocalPersistence, linkWithPhoneNumber, linkWithPopup, PhoneAuthProvider, RecaptchaVerifier, setPersistence, signInWithCredential,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  User,
  UserCredential,
  UserInfo
} from '@angular/fire/auth';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs/internal/Subscription';
import { Users } from '../types';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { FirestoreService } from './firestore.service'
import { environment } from 'src/environments/environment';
import { from } from 'rxjs/internal/observable/from';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError } from 'rxjs/internal/operators/catchError';
import { map } from 'rxjs/internal/operators/map';
import { tap } from 'rxjs/internal/operators/tap';
import { API_AUTH_FIREBASE } from '../variables';
import { handleError } from '../functions';
import { throwError } from 'rxjs/internal/observable/throwError';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {


  token: string | undefined = ''

  private authStateResolved = new BehaviorSubject<boolean>(false)

  private userSubject = new BehaviorSubject<Users & { currProviderData: UserInfo | null } | null>(null);

  private userSubs: Subscription
  private authSubs: Subscription

  constructor(private auth: Auth, private fireService: FirestoreService, private http: HttpClient) {
    this.initAuth()
  }

  isAuthenticated(): Observable<boolean> {
    return this.fireService.authState().pipe(
      map(user => !!user)
    )
  }

  get isAuthStateResolved() {
    return this.authStateResolved.asObservable();
  }
  get user$(): Observable<Users & { currProviderData: UserInfo | null } | null> {
    return this.userSubject.asObservable();
  }


  // Sign in with Google
  signInWithGoogle(provider: GoogleAuthProvider) {
    return from(this.fireService.signInWithPopup(provider)).pipe(
      switchMap((result) =>  this.emptyBackend(result.user.getIdToken(), provider.providerId, result)), // Use emptyBackend to avoid email enumaration protection 
      catchError((error) => {
        console.error('Google sign-in error:', error?.code);
        return throwError(() => error);
      })
    );
  }

  // Sign in with Facebook
  signInWithFacebook(provider: FacebookAuthProvider) {
    return from(this.fireService.signInWithPopup(provider)).pipe(
      switchMap((result) => this.emptyBackend(result.user.getIdToken(), provider.providerId, result)),
      catchError((error) => {
        console.error('Facebook sign-in error:', error?.code);
        return throwError(() => error);
      })
    );
  }

  // Sign in with GitHub
  signInWithGitHub(provider: GithubAuthProvider) {
    return from(this.fireService.signInWithPopup(provider)).pipe(
      switchMap((result) => this.emptyBackend(result.user.getIdToken(), provider.providerId, result)),
      catchError((error) => {
        console.error('Github sign-in error:', error?.code);
        return throwError(() => error);
      })
    );
  }

  // Sign in with Email and Password
  signInWithEmail(email: string, password: string) {
    return from(this.fireService.signInWithEmailAndPassword(email, password)).pipe(
      switchMap((result) => this.emptyBackend(result.user.getIdToken(), 'password', result)),
      catchError((error) => {
        console.error('Email/Password sign-in error:', error?.code);
        return throwError(() => error)
      })
    );
  }

  // Phone sign-in methods
  async signInWithPhone(phoneNumber: string, appVerifier: RecaptchaVerifier) {
    return signInWithPhoneNumber(this.auth, phoneNumber, appVerifier);
  }

  // Link phone number to existing account
  async linkPhoneNumber(phoneNumber: string, appVerifier: RecaptchaVerifier) {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No user logged in');

    return linkWithPhoneNumber(currentUser, phoneNumber, appVerifier);
  }

  // Verify and sign in with phone credential
  async verifyPhoneCode(verificationId: string, code: string) {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    return signInWithCredential(this.auth, credential);
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

    if (this.fireService.isLocalhost() && environment.emulators) {
      // Connect to Firebase Emulators if running on localhost and not in production
      console.log('🔥 Connecting Auth Service to Firebase Emulators');
      connectAuthEmulator(this.auth, 'http://localhost:9099');
    }

    this.fireService.authState().pipe(
      switchMap(async user => {
      console.log('Auth state changed. User:', user)

      if (!user) {
        this.userSubject.next(null);
        this.token = undefined;
        this.authStateResolved.next(false);
        return null;
      }

      if (this.authStateResolved.value)
        return user

      try {
        const token = await user.getIdToken();
        const userData = await this.fireService.getUserData(user.uid) as Users;

        const currProviderLogin = userData.providerId || null;
        const currProviderData = userData.providerData.find((p: any) => p.providerId === currProviderLogin) || null

        console.warn('User data from Firestore:', userData, 'Current provider data:', currProviderData)

        this.userSubject.next({ ...userData, currProviderData });
        this.token = token;
        this.authStateResolved.next(true);

        return user;
      } catch (error) {
        console.error('Error initializing auth:', error);
        this.userSubject.next(null);
        this.token = undefined;
        this.authStateResolved.next(false);
        return null;
      }
      })
    ).subscribe({
      error: (error) => {
      console.error('Error in auth state change:', error);
      },
      complete: () => {
      console.log('Auth state change completed.');
      }
    });
  }

  checkUserEmailForDifferentProvider(email: string): Observable<{
    exists: boolean,
    providers: string[],
    hasMultipleProviders: boolean
  }> {


    const url = `${API_AUTH_FIREBASE}/provider/email/${email}` // Replace with your API endpoint
    // const headers = {
    //   'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
    //   'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
    // }

    return this.http.get<{
      exists: boolean,
      providers: string[],
      hasMultipleProviders: boolean
    }>(url).pipe(
      tap((response) => {
        console.log('Check Email Existance:', response)
      }),
      map((response) => response),
      catchError((error) => throwError(() => error.error || 'Server error'))
    )
  }

  verifyAndLinkProvider(idToken: string, providerId: string): Observable<{ duplicateFound: boolean, existingUid?: string }> {
    const url = `${API_AUTH_FIREBASE}/verifyAndLink`
    const body = { idToken, providerId }
    return this.http.post<{ duplicateFound: boolean, existingUid?: string }>(url, body).pipe(
      catchError((error) => throwError(() => error.error || 'Server error'))
    );
  }
  private emptyBackend(idTokenPromise: Promise<string>, providerId: string, userCredential: any): Observable<{
    mergeRequired: boolean,
    user: User,
    result: UserCredential,
    credential?: any,
    existingUid?: string
  }> {

    return of({
              mergeRequired: false,
              user: userCredential.user,
              result: userCredential,
              credential: userCredential.credential,
              existingUid: "" // Include existingUid if provided by backend
    })
  }
  private sendTokenToBackend(idTokenPromise: Promise<string>, providerId: string, userCredential: any): Observable<{
    mergeRequired: boolean,
    user: User,
    result: UserCredential,
    credential?: any,
    existingUid?: string
  }> {
    return from(idTokenPromise).pipe(
      switchMap((idToken) => {
        const url = `${API_AUTH_FIREBASE}/verify-login`;

        const body = { idToken, providerId }
        return this.http.post(url, body).pipe(
          map((response: any) => {
            return {
              mergeRequired: response.mergeRequired,
              user: userCredential.user,
              result: userCredential,
              credential: userCredential.credential,
              existingUid: response.existingUid // Include existingUid if provided by backend
            };
          }),
          catchError((error) => throwError(() => error.error || 'Server error'))
        );
      })
    );
  }

  logout() {
    return from(this.fireService.signOut())
  }

  ngOnDestroy() {
    this.authSubs?.unsubscribe()
    this.userSubs?.unsubscribe()
  }
}
