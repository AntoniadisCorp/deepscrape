import { DestroyRef, inject, Injectable } from '@angular/core';
import {
  Auth, AuthProvider, authState, browserLocalPersistence, connectAuthEmulator, EmailAuthProvider, FacebookAuthProvider,
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider, indexedDBLocalPersistence, linkWithPhoneNumber, linkWithPopup, PhoneAuthProvider, reauthenticateWithCredential, RecaptchaVerifier, setPersistence, signInWithCredential,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  unlink,
  updatePassword,
  User,
  UserCredential,
  UserInfo
} from '@angular/fire/auth';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs/internal/Subscription';
import { Guest, loginHistoryInfo, Users } from '../types';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { FirestoreService } from './firestore.service'
import { environment } from 'src/environments/environment';
import { from } from 'rxjs/internal/observable/from';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError } from 'rxjs/internal/operators/catchError';
import { map } from 'rxjs/internal/operators/map';
import { tap } from 'rxjs/internal/operators/tap';
import { API_AUTH_FIREBASE } from '../variables';
import { cleanAndParseJSON, handleError } from '../functions';
import { throwError } from 'rxjs/internal/observable/throwError';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { of, pipe, timestamp } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorage } from './storage.service';
import { Analytics } from '@angular/fire/analytics';
import { HeartbeatService } from './heartbeat.service';
import { AnalyticsService } from './analytics.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private destroyRef = inject(DestroyRef)
  private analytics = inject(Analytics)
  private cookieService = inject(CookieService)
  private localStorage = inject(LocalStorage)
  private heartbeatService = inject(HeartbeatService)
  token: string | undefined = ''
  isAdmin: boolean = false

  private authStateResolved = new BehaviorSubject<boolean>(false)

  private userSubject = new BehaviorSubject<Users & { currProviderData: UserInfo | null } | null>(null);

  private userSubs: Subscription
  private authSubs: Subscription

  constructor(
    private auth: Auth, private fireService: FirestoreService,
    private http: HttpClient, private functions: Functions,

    private analyticsService: AnalyticsService
  
  ) {
    this.initAuth()
  }

  isAuthenticated(): Observable<{ isAuthenticated: boolean, user: Users & { currProviderData: UserInfo | null } | null }> {
    return this.fireService.authState().pipe(
      map(user => ({ isAuthenticated: !!user, user })),
      switchMap(async isAuthData => {
        const { isAuthenticated, user } = isAuthData;

        if (!isAuthenticated || !user) {
          this.authStateResolved.next(false);
          this.userSubject.next(null);
          this.token = undefined;
          this.heartbeatService.stop(); // Stop heartbeat if not authenticated
          return { isAuthenticated: false, user: null }; // Ensure consistent return type
        }

        // Return cached user if already resolved
        // if (this.authStateResolved.value && this.userSubject.value) {
        //   return { isAuthenticated: true, user: this.userSubject.value };
        // }

        // Save token
        this.token = await user.getIdToken();
        const userData = await this.fireService.getUserData(user.uid) as Users;
        const getTokenResult = await user.getIdTokenResult()
        
        this.isAdmin = typeof getTokenResult.claims?.['role'] === 'string' && getTokenResult.claims['role'] === 'admin'
        console.log('User is admin:', this.isAdmin, getTokenResult.claims)
        if (!userData) throw new Error('No user data found');

        // Determine current login provider user info
        const currProviderLogin = userData.providerId || null;
        const currProviderData = userData.providerData.find((p: any) => p.providerId === currProviderLogin) || null;

        console.warn('User data from Firestore:', userData, 'Current provider data:', currProviderData);

        // Save user data to the subject
        this.userSubject.next({ ...userData, currProviderData });

        // Mark auth as resolved
        this.authStateResolved.next(true);
        this.heartbeatService.start(this.token); // Start heartbeat when authenticated

        // Return user data
        return { isAuthenticated: true, user: this.userSubject.value }
      }),
      catchError((error) => {
        console.error('Error in isAuthenticated:', error);
        this.authStateResolved.next(false)
        this.userSubject.next(null);
        this.token = undefined;
        return of({ isAuthenticated: false, user: null })
      })
    )
  }
  get isAuthStateResolved() {
    return this.authStateResolved.asObservable();
  }
  get user$(): Observable<Users & { currProviderData: UserInfo | null } | null> {
    return this.userSubject.asObservable();
  }
  /**
   * Refreshes user data after external changes (like email verification)
   * This updates the userSubject with fresh data from Firestore
   * If userId is provided, it refreshes that specific user, otherwise uses the current authenticated user
   * Useful when user profile changes outside of regular login flow
   * 
   * @param userId - Optional user ID to refresh. If not provided, uses current authenticated user
   * @throws Error if no user is found or data fetch fails
   */
  async refreshUserData(userId?: string): Promise<void | any> {
    try {
      const uid = userId || this.auth.currentUser?.uid;
      
      if (!uid) {
        throw new Error('No user ID provided and no authenticated user found');
      }
      
      // Refresh Firebase Auth user to get updated emailVerified flag (only if current user)
      if (!userId && this.auth.currentUser) {
        await this.auth.currentUser.reload();
      }
      
      // Get fresh user data from Firestore
      const userData = await this.fireService.refreshUserFromFirestore(uid) as Users;
      
      if (!userData) {
        throw new Error('User data not found in Firestore');
      }
      
      // Determine current login provider user info
      const currProviderLogin = userData.providerId || null;
      const currProviderData = userData.providerData.find((p: any) => p.providerId === currProviderLogin) || null;
      
      // Update the user subject with fresh data
      const updatedUser = { ...userData, currProviderData };
      this.userSubject.next(updatedUser);
      
      console.log('User data refreshed after email verification');
      return updatedUser;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  }

  // Sign in with Google
  signInWithGoogle(provider: GoogleAuthProvider) {
    return from(this.fireService.signInWithPopup(provider)).pipe(
      switchMap((result) => this.emptyBackend(result.user.getIdToken(), provider.providerId, result)), // Use emptyBackend to avoid email enumaration protection 
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

  async updatePassword(newPassword: string): Promise<UserCredential | null> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      throw new Error('No user logged in');
    }

    try {
      // Check if the user is already linked with the password provider
      const isPasswordLinked = currentUser.providerData.some(
        (provider) => provider.providerId === EmailAuthProvider.PROVIDER_ID
      );

      if (!isPasswordLinked) {
        // Link the password provider if not already linked
        const credential = EmailAuthProvider.credential(currentUser.email || '', newPassword);
        return await this.linkWithCredential(credential)
      }

      // Update the password
      await this.fireService.updatePassword(currentUser, newPassword)
      return null
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Failed to update password. Please ensure your current password is correct.');
    }
  }

  // Verify and sign in with phone credential
  async verifyPhoneCode(verificationId: string, code: string) {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    return signInWithCredential(this.auth, credential);
  }

  // Link additional provider to existing account
  async linkProvider(provider: AuthProvider) {
    const currentUser = this.auth.currentUser
    if (currentUser) {
      return await this.fireService.linkWithPopup(currentUser, provider)
    } else {
      throw new Error('No user is currently signed in.');
    }
  }

  async unlinkProvider(providerId: string): Promise<void> {
    try {
      const currentUser: User | null = this.auth.currentUser;

      if (!currentUser) {
        throw new Error('No user is currently signed in.');
      }

      // Unlink the provider from the current user
      const result = await unlink(currentUser, providerId);

      console.log(`Provider ${providerId} unlinked successfully.`, result)
    } catch (error) {
      console.error(`Error unlinking provider ${providerId}:`, error);
      throw error; // Re-throw the error for further handling
    }
  }

  async linkWithCredential(credential: any) {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No user logged in')
    return this.fireService.linkWithCredential(currentUser, credential)
  }


  /**
   * TODO: comment initAuth
   * @description Inits auth
   */
  async initAuth(): Promise<(Users & { currProviderData: UserInfo | null }) | null> {

    if (this.fireService.isLocalhost() && environment.emulators) {
      // Connect to Firebase Emulators if running on localhost and not in production
      console.log('🔥 Connecting Auth Service to Firebase Emulators');
      connectAuthEmulator(this.auth, 'http://localhost:9099');
    }    return null
    
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

  /**
   * Link guest to user only once per session.
   * Uses localStorage/sessionStorage to ensure single call per session.
   */
  async linkGuestToUserOncePerSession(userId: string, guestId: string): Promise<Guest | null> {
    const key = `guest-link-${userId}-${guestId}`;
    if (sessionStorage.getItem(key)) return null; // Already linked this session
    sessionStorage.setItem(key, 'true');
    // Call existing linkGuestToUser logic
    const { err, guestInfo } = await this.linkGuestToUser(userId, guestId);
    if (err) throw err;
    return guestInfo || null;
  }
  
  async linkGuestToUser(uid: string, guestId: string) {

    return await this.fireService.linkGuestToUser(uid, guestId)
  }

  async recordLoginMetrics(userId: string, metrics: Partial<loginHistoryInfo>, guestInfo?: Guest) {
    if (!metrics.providerId) {
      throw new Error("providerId is required for loginHistoryInfo");
    }
    // Cast metrics to loginHistoryInfo after ensuring required fields are present
    return await this.fireService.setUserLoginMetrics(userId, metrics as loginHistoryInfo, guestInfo)
  }

  logout() {
    const tokenTemp = this.token
    let {userId, loginId} = this.getLoginIdFromStorage()
    userId = userId || this.userSubject.value?.uid || ''

    // Immediately clear user state to prevent race conditions with Firestore listeners
    this.userSubject.next(null);
    this.authStateResolved.next(false);

    this.heartbeatService.stop(); // Stop heartbeat on logout

    return from(this.fireService.setSignOutMetrics(userId, loginId)).pipe(
      tap(() => this.trackingLogout('logout', false, this.token), this.token = undefined),
      switchMap(() => from(this.fireService.signOut())),
      catchError(async (error) => { 
        console.error('Logout error:', error)
        this.trackingLogout('logout', true, tokenTemp)
        // await this.fireService.signOut()
        return throwError(() => error) 
      }
    ))
  }

  private trackingLogout(method: string, withError: boolean = false, token?: string) {
    try {
      // Only track if analyticsService and destroyRef are available
      if (this.analyticsService && this.destroyRef) {
        this.analyticsService.trackEvent('logout', {
          method: 'logout',
          withError,
          timestamp: new Date().toISOString()
        }, token, this.userSubject.value?.uid, this.getLoginIdFromStorage().guestId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
      }
    } catch (err) {
      console.warn('Analytics tracking failed during logout:', err);
    }
  }

  private getLoginIdFromStorage() {
    // Try to get loginId from cookie first, then fallback to localStorage
    const aid = this.cookieService.get('aid')

    // parse loginId from aid cookie if exists
    let { loginId, userId, guestId } = cleanAndParseJSON(aid || '{}') as { userId: string, guestId: string, loginId?: string }

    // Fallback to localStorage if not found in cookie
    loginId = loginId || this.localStorage.getItem('loginId') || '' as string

    return {loginId, userId, guestId}
  }

  ngOnDestroy() {
    this.authSubs?.unsubscribe()
    this.userSubs?.unsubscribe()
  }
}
