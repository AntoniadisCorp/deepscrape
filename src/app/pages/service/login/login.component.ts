import { Component, OnInit, OnDestroy, AfterViewInit, Inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Loading, Users } from 'src/app/core/types';
import { CommonModule, DOCUMENT, JsonPipe, NgIf } from '@angular/common';
import {
  Auth, GithubAuthProvider, GoogleAuthProvider, OAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword, signInWithPopup, updateCurrentUser, updateProfile,
  User, fetchSignInMethodsForEmail,
  verifyBeforeUpdateEmail,
  getAdditionalUserInfo,
  UserInfo,
  AdditionalUserInfo,
  user,
  RecaptchaVerifier,
  ConfirmationResult,
  PhoneAuthProvider,
  isSignInWithEmailLink,
  signInWithEmailLink,
  AuthCredential,
  UserCredential
} from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { from } from 'rxjs/internal/observable/from';
import { getErrorMessage } from 'src/app/core/functions';
import { AuthService, FirestoreService, SnackbarService } from 'src/app/core/services';
import { Subscription } from 'rxjs';
import { DEFAULT_PROFILE_URL } from 'src/app/core/variables';
import { SnackBarType } from 'src/app/core/components';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinner, MatIcon, NgIf],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {

  protected loading: Loading;
  protected loginForm: FormGroup; // Combined form for email/phone and password/code

  protected errorMessage = '';
  public recaptchaVerifier!: RecaptchaVerifier;
  public confirmationResult!: ConfirmationResult;
  public currentAuthMethod: 'email' | 'phone' | null = null; // Tracks if user is trying email or phone login
  public phoneVerificationSent: boolean = false; // Tracks if SMS code has been sent
  protected pendingCredential: AuthCredential | null = null; // Stores credential for linking

  protected isAuthenticated: boolean;
  private authSubs: Subscription;
  private signInSusbscribe: Subscription;
  private signInWithEmailSusbscribe: Subscription

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private firestore: Firestore,
    private firestoreService: FirestoreService,
    private auth: Auth,
    private authService: AuthService,

    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private snackbarService: SnackbarService,
  ) {
    this.loading = {
      github: false,
      logout: false,
      google: false,
      email: false,
      phone: false,
      code: false
    };

    this.authSubs = this.authService.isAuthenticated().subscribe(
      (authenticated: boolean) => {
        this.isAuthenticated = authenticated;
      }
    );

    // this.firestore = this.firestoreService.getInstanceDB('easyscrape');

    this.loginForm = this.formBuilder.group({
      identifier: this.formBuilder.control('', {
        validators: [
          Validators.required,
          Validators.pattern(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\+[1-9]\d{7,14})$/)
        ]
      }), // Email or phone number (phone must start with + and is required)
      password: this.formBuilder.control('', {
        validators: [Validators.required, Validators.minLength(8)]
      }), // For email/password login
      // verificationCode: [''], // For phone number login
      // rememberMe: [false],
    });
  }


  get f() {
    return this.loginForm.controls
  }

  // 'info' | 'success' | 'warning' | 'error'
  private showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }


  ngOnInit(): void {
    // Any other ngOnInit logic can go here
  }

  ngAfterViewInit(): void {

  }

  private initializeRecaptcha() {

    // Initialize RecaptchaVerifier here to ensure the element is in the DOM
    if (this.document.getElementById('recaptcha-container')) {
      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          console.log('Recaptcha solved:', response);
          // If phone number is already entered, proceed to send code
          if (this.currentAuthMethod === 'phone' && !this.phoneVerificationSent) {
            this.sendPhoneVerificationCode();
          }
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          this.showSnackbar('Recaptcha expired, please try again.', SnackBarType.warning);
        }
      });
      this.recaptchaVerifier.render();
    } else {
      console.warn('Recaptcha container element not found. Recaptcha will not be initialized.');
    }

  }


  login() {
    this.errorMessage = '';
    const identifier = this.loginForm.get('identifier')?.value;
    const password = this.loginForm.get('password')?.value;
    // const verificationCode = this.loginForm.get('verificationCode')?.value

    // Determine if the identifier is an email or a phone number
    const isEmail = identifier.includes('@');

    if (isEmail) {
    this.currentAuthMethod = 'email';
    this.loading.email = true;
    this.signInWithEmailSusbscribe = this.authService.signInWithEmail(identifier, password)
      .subscribe({
        next: async (response) => {

          if (response.user) {
            // this.pendingCredential = response.credential
            // If there's a pending credential from a previous social login attempt, link it now
            // await this.handlePendingCredentialLinking(response.user)
            const userData = await this.firestoreService.getUserData(response.user.uid)

            if (userData) {
              let updateUser = false
              // Update email verification status in Firestore if it changed in Firebase
              if (!userData.emailVerified && response.user.emailVerified) {
                userData.emailVerified = true
                updateUser = true
              } 

              // Update providerId if it has changed
              if (userData.providerId !== response.user.providerId)                
                updateUser = true

              if (updateUser)
                await this.firestoreService.storeUserData(response.user, "password", response.user.emailVerified)
  

              // Redirect to verification page if neither email nor phone is verified
              if (!response.user.emailVerified || userData.phoneVerified === false) {
                this.showSnackbar('Your email or phone number is not verified. Please verify to proceed.', SnackBarType.warning, '', 5000)
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
                this.router.navigate(['/service/verification'], { queryParams: returnUrl })
                return
              }
            }

            this.isAuthenticated = true
            this.showSnackbar('Sign-in successful', SnackBarType.success, '', 3000);
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
            this.router.navigateByUrl(returnUrl)
          } 
        },
        error: (error) => {
          // this.extractFirebaseError(error)
          this.errorMessage = getErrorMessage(error)
          this.handleAccountExistsError(error, 'password')
          this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000)
          this.loading.email = false
        },
        complete: () => {
          this.loading.email = false
        }
      })
    }
    /* else {
     // // Assume phone number if not email
     // this.currentAuthMethod = 'phone';
     // if (!this.phoneVerificationSent) {
     //   // First step: send verification code
     //   this.sendPhoneVerificationCode();
     // } else {
     //   // Second step: verify code
     //   this.verifyPhoneNumberCode();
     // }
   } */
  }

  async loginWithGoogle() {
    this.loading.google = true;
    this.errorMessage = '';

    const provider = new GoogleAuthProvider()
    provider.addScope("email")
    provider.addScope("profile")
    provider.addScope("openid")
    provider.setCustomParameters({ prompt: 'select_account' })
    // Use the AuthService to handle Google sign-in  
    this.signInSusbscribe = this.authService.signInWithGoogle(provider).subscribe({
      next: async (response) => {
        if (response.user) {
          // this.pendingCredential = GoogleAuthProvider.credentialFromResult(response.result);
          // If there's a pending credential from a previous social login attempt, link it now
          // const userCredential =  await this.handlePendingCredentialLinking(response.user)
          // response.user = userCredential?.user || response.user

          if (response.user.displayName || response.user.photoURL) {
            await updateProfile(response.user, {
              displayName: response.user.displayName,
              photoURL: response.user.photoURL || DEFAULT_PROFILE_URL,
            })
          }
          
          await this.firestoreService.storeUserData(response.user, "google.com", true)
          this.showSnackbar('Sign-in successful', SnackBarType.success, '', 3000)
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl)
        } else {
          this.errorMessage = 'User object is null after sign-in.';
          this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000)
        }
      },
      error: (error) => {
        // this.extractFirebaseError(error)
        this.handleAccountExistsError(error, 'google.com')
        this.errorMessage = getErrorMessage(error)
        this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000)
        this.cdr.detectChanges(); // Explicitly trigger change detection
        this.loading.google = false
      },
      complete: () => {
        this.loading.google = false;

      }
    })
  }

  async loginWithGithub() {
    this.loading.github = true;
    this.errorMessage = ''


    const provider = new GithubAuthProvider();
    provider.addScope('user:email')
    provider.addScope('read:user')
    provider.setCustomParameters({ prompt: 'select_account' });

    this.signInSusbscribe = this.authService.signInWithGitHub(provider).subscribe({
      next: async (response) => {

        if (response.user) {
          // this.pendingCredential = GithubAuthProvider.credentialFromResult(response.result);
          // If there's a pending credential from a previous social login attempt, link it now
          // const userCredential =  await this.handlePendingCredentialLinking(response.user)
          // response.user = userCredential?.user || response.user

          if (response.user.displayName || response.user.photoURL) {
            await updateProfile(response.user, {
              displayName: response.user.displayName,
              photoURL: response.user.photoURL ? response.user.photoURL : DEFAULT_PROFILE_URL,
            })
          }
          await this.firestoreService.storeUserData(response.user, "github.com", true);
          this.showSnackbar('Sign-in successful', SnackBarType.success, '', 3000);
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl)
        }
      },
      error: (error) => {
        // this.extractFirebaseError(error)
        this.handleAccountExistsError(error, 'github.com')
        this.errorMessage = getErrorMessage(error)
        this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000)
        this.loading.github = false
      },
      complete: () => {
        this.loading.github = false
      }
    })
  }

  private handleAccountExistsError(error: any, providerId: string): void {

    // this.extractFirebaseError(error)
    const errorCode: string = error?.code as string
    if (errorCode === 'auth/account-exists-with-different-credential') {
      // Extract the credential from the error object
      // const credential = this.getProvider(providerId)?.credentialFromResult(error.result)

      // if (credential) {
      //   this.pendingCredential = credential
      //   this.errorMessage = `An account with this email already exists. Please sign in with your existing account to link it.`;
      // } else
      //   this.errorMessage = 'Failed to get credential - login error.';
      this.errorMessage = getErrorMessage(error)
      this.showSnackbar(this.errorMessage, SnackBarType.warning, '', 7000)
    }
  }

  private async handlePendingCredentialLinking(user: User) {
    if (!this.pendingCredential) {
      return null; // No pending credential to link
    }

    try {
      const usercredential = await linkWithCredential(user, this.pendingCredential);
      // this.showSnackbar('Account successfully linked!', SnackBarType.success, '', 3000);
      this.pendingCredential = null; // Clear the pending credential
      return usercredential
    } catch (error: any) {
      console.error('Error linking account:', error);
      this.errorMessage = getErrorMessage(error);
      // this.showSnackbar(`Error linking account: ${this.errorMessage}`, SnackBarType.error, '', 5000);
      this.pendingCredential = null; // Clear the pending credential even on error
      return null; // Return null to indicate no user credential
    }
  }

  private extractFirebaseError(error: any): void {
    if (typeof error === 'string' && error.toString().includes('auth/')) {
      // Attempt to extract the auth error code from the string, if present
      console.warn('Extracted Firebase error code:', error);
      const match = error.match(/auth\/([^)]+)/)
      if (match && match[1]) {
        // You can use match[1] if needed
        error = { code: match[1], message: error }
      }
    }
    return error
  }
  private getProvider(providerId: string) {
    switch (providerId) {
      case GoogleAuthProvider.PROVIDER_ID:
        return GoogleAuthProvider
      case GithubAuthProvider.PROVIDER_ID:
        return GithubAuthProvider;
      // Add other providers as needed
      default:
        return null;
    }
  }

  async sendPhoneVerificationCode() {
    this.loading.phone = true;
    this.errorMessage = '';
    try {
      const phoneNumber = this.loginForm.get('identifier')?.value;
      if (!phoneNumber) {
        throw new Error('Phone number is required.');
      }
      this.confirmationResult = await this.authService.signInWithPhone(phoneNumber, this.recaptchaVerifier);
      this.phoneVerificationSent = true;
      this.showSnackbar('Verification code sent to your phone.', SnackBarType.success);
    } catch (error: any) {
      console.error('Error sending phone verification code:', error);
      this.errorMessage = getErrorMessage(error);
      this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
      this.cdr.detectChanges(); // Explicitly trigger change detection
      this.resetAuthFlow(); // Reset on error
    } finally {
      this.loading.phone = false;
    }
  }

  async verifyPhoneNumberCode() {
    this.loading.code = true;
    this.errorMessage = '';
    try {
      const verificationCode = this.loginForm.get('verificationCode')?.value;
      if (!verificationCode) {
        throw new Error('Verification code is required.');
      }
      const userCredential = await this.authService.verifyPhoneCode(this.confirmationResult.verificationId, verificationCode);

      if (userCredential.user) {
        let userData = await this.firestoreService.getUserData(userCredential.user.uid);
        if (userData) {
          // Update user data in Firestore, including phone number and verification status
          // Assuming phoneVerified is set to true by Firebase on successful verification
          await this.firestoreService.storeUserData(userCredential.user, "phone", true)

          if (!userCredential.user.phoneNumber) {
            this.showSnackbar('Phone number not found on user object after verification.', SnackBarType.error, '', 5000);
            this.resetAuthFlow();
            return;
          }

          // Check if phone number is verified in Firestore (or Firebase user object)
          // Firebase automatically marks phone number as verified on successful sign-in/link
          this.showSnackbar('Phone number verified and signed in successfully!', SnackBarType.success)
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl)
        } else {
          this.showSnackbar('Sign-in failed: User data not found after phone verification.', SnackBarType.error, '', 3000);
          this.resetAuthFlow()
        }
      } else {
        this.errorMessage = 'User object is null after phone verification.'
        this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
        this.resetAuthFlow()
      }
    } catch (error: any) {
      console.error('Error verifying phone number code:', error);
      this.errorMessage = getErrorMessage(error);
      this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
      this.cdr.detectChanges(); // Explicitly trigger change detection
      this.resetAuthFlow(); // Reset on error
    } finally {
      this.loading.code = false;
    }
  }

  resetAuthFlow() {
    this.currentAuthMethod = null;
    this.phoneVerificationSent = false;
    this.loginForm.reset();
    this.errorMessage = '';

    this.recaptchaVerifier?.clear();
    this.recaptchaVerifier?.render() // Re-render for next attempt

  }

  ngOnDestroy(): void {
    this.authSubs?.unsubscribe();
    this.signInSusbscribe?.unsubscribe()
    this.signInWithEmailSusbscribe?.unsubscribe()

    this.recaptchaVerifier?.clear();

  }
}
