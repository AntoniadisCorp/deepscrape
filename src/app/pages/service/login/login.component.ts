import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Inject,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
  DOCUMENT
} from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, JsonPipe, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subject, takeUntil } from 'rxjs';

import {
  Auth,
  AuthCredential,
  ConfirmationResult,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
  GithubAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  OAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  updateCurrentUser,
  updateProfile,
  User,
  UserCredential,
  user,
  verifyBeforeUpdateEmail,
  AdditionalUserInfo,
  UserInfo
} from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Analytics, setUserId, setUserProperties } from '@angular/fire/analytics';
import { HttpClient } from '@angular/common/http';

import { CookieService } from 'ngx-cookie-service'; // Import CookieService

import { I18nService } from 'src/app/core/i18n';
import { cleanAndParseJSON, getBrowser, getDeviceFingerprintHash, getErrorMessage } from 'src/app/core/functions';
import { AnalyticsService, AuthService, FirestoreService, LocalStorage, SnackbarService, ThemeService, WindowToken } from 'src/app/core/services';
import { SnackBarType } from 'src/app/core/components';
import { DEFAULT_PROFILE_URL } from 'src/app/core/variables';
import { NAVIGATOR } from 'src/app/core/providers';
import { loginHistoryInfo, Guest, Loading } from 'src/app/core/types';
/**
 * @description Represents the credentials obtained after a login attempt,
 * including information about whether a merge is required, the user object,
 * the user credential result, and optional credential/existing UID for linking accounts.
 */
type loginCredentials = {
  mergeRequired: boolean;
  user: User;
  result: UserCredential;
  credential?: any;
  existingUid?: string;
};

/**
 * @description Component for handling user login functionalities, including
 * email/password, Google, and GitHub authentication, as well as phone verification.
 */
@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatProgressSpinner, MatIcon, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  // Removed ChangeDetectionStrategy.OnPush as it requires manual change detection for async operations
})
export class LoginComponent  {
  // Injected services using Angular's inject function for better testability and type safety.
  @ViewChild('recaptchaContainer', { static: false }) recaptchaContainer!: ElementRef<HTMLDivElement>;

  /** Analytics service for tracking user interactions. */
  private analytics = inject(Analytics);
  /** Custom analytics service for application-specific event tracking. */
  private analyticsService = inject(AnalyticsService);
  /** Local storage service for storing key-value pairs. */
  private localStorage = inject(LocalStorage);
  /** Platform identifier for SSR detection */
  private platformId = inject<Object>(PLATFORM_ID);
  /** A service for handling component destruction, used with `takeUntilDestroyed`. */
  private DestroyRef = inject(DestroyRef)

  private themePicker = inject(ThemeService)
  protected isDarkMode$: Observable<boolean> = this.themePicker.isDarkMode$; 

  // Component properties
  /** Manages the loading state for various authentication methods. */
  protected loading: Loading;
  /** Reactive form group for handling login input fields (identifier and password). */
  protected loginForm: FormGroup;
  /** Stores any error messages to be displayed to the user. */
  protected errorMessage: string = '';
  /** Instance of Firebase RecaptchaVerifier for phone authentication. */
  public recaptchaVerifier!: RecaptchaVerifier;
  /** Stores the confirmation result after sending a phone verification code. */
  public confirmationResult!: ConfirmationResult;
  /** Tracks the currently active authentication method (email or phone). */
  public currentAuthMethod: 'email' | 'phone' | null = null;
  /** Indicates whether an SMS verification code has been sent for phone login. */
  public phoneVerificationSent: boolean = false;
  /** Stores a pending credential for linking accounts in case of existing accounts with different providers. */
  protected pendingCredential: AuthCredential | null = null;

  // Subscriptions to manage memory leaks
  /** Subject for unsubscribing all subscriptions. */
  private destroy$ = new Subject<void>();

  /** Debounce timer for analytics events. */
  private analyticsDebounceTimer: any = null;
  /** Analytics event queue for batching. */
  private analyticsEventQueue: any[] = [];
  private window = inject(WindowToken);

  /**
   * Preload Google and GitHub providers on init for faster popup.
   */
  private googleProvider: GoogleAuthProvider;
  private githubProvider: GithubAuthProvider;

  /**
   * @description Constructor for LoginComponent.
   * Initializes services and sets up the login form.
   * @param {FormBuilder} formBuilder - Service for building reactive forms.
   * @param {Router} router - Service for navigating between routes.
   * @param {ActivatedRoute} route - Provides access to information about a route associated with a component.
   * @param {FirestoreService} firestoreService - Service for interacting with Firestore database.
   * @param {Auth} auth - Firebase Auth instance.
   * @param {AuthService} authService - Custom authentication service.
   * @param {I18nService} i18nService - Service for internationalization.
   * @param {TranslateService} translate - Service for translating content.
   * @param {HttpClient} http - Angular's HTTP client for making requests.
   * @param {Navigator} navigator - Injected `Navigator` object for browser information.
   * @param {Document} document - Injected `Document` object for DOM manipulation.
   * @param {ChangeDetectorRef} cdr - Service for triggering change detection.
   * @param {SnackbarService} snackbarService - Service for displaying snackbar messages.
   * @param {CookieService} cookieService - Service for managing cookies.
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private auth: Auth,
    private authService: AuthService,
    private i18nService: I18nService,
    private translate: TranslateService,
    private http: HttpClient,
    @Inject(NAVIGATOR) private navigator: Navigator,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private snackbarService: SnackbarService,
    private cookieService: CookieService,
  ) {
    // Initialize loading states for various authentication methods.
    this.loading = {
      github: false,
      logout: false,
      google: false,
      remove: false,
      email: false,
      phone: false,
      code: false,
      password: false,
      mfa: false
    };

    // Initialize the login form with validation rules.
    // The identifier can be an email or a phone number.
    this.loginForm = this.formBuilder.group({
      identifier: this.formBuilder.control('', {
        validators: [
          Validators.required,
          // Pattern for email or phone number (phone must start with + and is required)
          Validators.pattern(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\+[1-9]\d{7,14})$/)
        ]
      }),
      // Password field for email/password login.
      password: this.formBuilder.control('', {
        validators: [Validators.required, Validators.minLength(8)]
      }),
      // Commented out verificationCode and rememberMe as they are not currently in use.
      // verificationCode: [''],
      // rememberMe: [false],
    });

  }

  /**
   * @description Getter for easy access to form controls,
   * typically used in the template for validation.
   * @returns {any} The controls of the login form.
   */
  get f(): any {
    return this.loginForm.controls;
  }

  /**
   * @description Displays a snackbar message to the user.
   * @param {string} message - The message content to display.
   * @param {SnackBarType} [type=SnackBarType.info] - The type of snackbar (info, success, warning, error).
   * @param {string} [action=''] - Optional action text to display in the snackbar.
   * @param {number} [duration=3000] - The duration in milliseconds the snackbar will be visible.
   */
  private showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string = '',
    duration: number = 3000
  ): void {
    this.snackbarService.showSnackbar(message, type, action, duration);
  }

  /**
   * @description Helper to set loading state by provider.
   * @param {string} provider - The provider for which to set the loading state.
   * @param {boolean} value - The loading state value to set.
   */
  private setLoading(provider: string, value: boolean) {
    switch (provider) {
      case 'email': this.loading.email = value; break;
      case 'google.com': this.loading.google = value; break;
      case 'github.com': this.loading.github = value; break;
      case 'phone': this.loading.phone = value; break;
      default: break;
    }
  }

  /**
   * @description Centralized error handler for login flows.
   * @param {any} error - The error object.
   * @param {string} context - Context of the error.
   * @param {string} provider - Provider causing the error.
   */
  private handleError(error: any, context: string, provider: string) {
    const errorMsg = getErrorMessage(error, this.translate);
    this.errorMessage = errorMsg;
    this.showSnackbar(errorMsg, SnackBarType.error, '', 5000);
    this.trackLoginAttempt(provider, false, undefined, errorMsg, context);
    this.setLoading(provider, false);
    this.loginInProgress = false;
  }

  /**
   * @description Debounced analytics event tracker.
   * @param {any} event - Analytics event payload.
   */
  private debounceTrackEvent(event: any) {
    this.analyticsEventQueue.push(event);
    if (this.analyticsDebounceTimer) clearTimeout(this.analyticsDebounceTimer);
    this.analyticsDebounceTimer = setTimeout(() => {
      this.analyticsService
        .batchTrackEvents([...this.analyticsEventQueue])
        .pipe(takeUntilDestroyed(this.DestroyRef))
        .subscribe({
          error: (err) => console.error('Failed to send analytics batch', err),
        });
      this.analyticsEventQueue = [];
    }, 500); // 500ms debounce
  }

  /**
   * @description Standardized login attempt tracker.
   * @param {string} method - Login method.
   * @param {boolean} success - Success status.
   * @param {string} [token] - Firebase ID token.
   * @param {string} [errorMsg] - Error message.
   * @param {string} [context] - Context of the login attempt.
   */
  private async trackLoginAttempt(method: string, success: boolean, token?: string, errorMsg?: string, context?: string): Promise<void> {
    const browser = await getBrowser(this.navigator) || 'Unknown';
    const platform = this.navigator?.platform || 'Unknown';
    const payload = {
      method,
      success,
      timestamp: new Date().toISOString(),
      browser,
      platform,
      errorMsg: errorMsg || null,
      context: context || null
    };
    this.debounceTrackEvent(payload);
  }

  /**
   * @description Lifecycle hook that is called after Angular has initialized all data-bound properties of a directive.
   * Sets the initial language and subscribes to language changes.
   */
  ngOnInit(): void {
    // Set the initial language for translation.
    this.translate.use(this.i18nService.currentLang());

    // Subscribe to language changes and update the translation service.
    this.i18nService.currentLang$
      .pipe(takeUntilDestroyed(this.DestroyRef)) // Automatically unsubscribe when the component is destroyed.
      .subscribe((lang) => {
        this.translate.use(lang);
      });

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Preload providers
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');
    this.googleProvider.addScope('openid');
    this.googleProvider.setCustomParameters({ prompt: 'select_account' });
    this.githubProvider = new GithubAuthProvider();
    this.githubProvider.addScope('user:email');
    this.githubProvider.addScope('read:user');
    this.githubProvider.setCustomParameters({ prompt: 'select_account' })    
  }

  /**
   * @description Lifecycle hook that is called after Angular has fully initialized a component's view.
   * Placeholder for any view-related initialization.
   */
  ngAfterViewInit(): void {
    // Recaptcha initialization might be placed here if it depends on DOM elements being present.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initializeRecaptcha()
  }


  /**
   * @description Initializes the Firebase reCAPTCHA verifier for phone authentication.
   * This is crucial for preventing abuse of the phone sign-in flow.
   */
  private initializeRecaptcha(): void {
    // Check if the reCAPTCHA container element exists in the DOM.
    if (this.recaptchaContainer && this.recaptchaContainer.nativeElement) {
      // Initialize RecaptchaVerifier with the Firebase Auth instance and container element (not id).
      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, this.recaptchaContainer.nativeElement, {
        'size': 'invisible', // Set to invisible to avoid user interaction initially.
        callback: (response: any) => {
          // Callback function when reCAPTCHA is successfully solved.
          console.log('Recaptcha solved:', response);
          // If the current authentication method is phone and the verification code hasn't been sent,
          // proceed to send the SMS.
          if (this.currentAuthMethod === 'phone' && !this.phoneVerificationSent) {
            this.sendPhoneVerificationCode();
          }
        },
        'expired-callback': () => {
          // Callback function when the reCAPTCHA response expires.
          // Notify the user to solve reCAPTCHA again.
          this.showSnackbar(this.translate.instant('LOGIN.RECAPTCHA_EXPIRED'), SnackBarType.warning);
        }
      });
      // Render the reCAPTCHA widget.
      this.recaptchaVerifier.render();
    } else {
      console.warn('Recaptcha container element not found. Recaptcha will not be initialized.');
    }
  }

  /**
   * Debounce login button to prevent rapid submissions.
   */
  private loginInProgress = false;

  /**
   * @description Handles the login process, determining whether the user is
   * attempting to log in with email/password.
   * Removed phone login path from here as it's not fully implemented.
   */
  public async login(): Promise<void> {
    if (this.loginInProgress) return;
    this.loginInProgress = true;
    this.errorMessage = ''; // Clear any previous error messages.
    const identifier = this.loginForm.get('identifier')?.value;
    const password = this.loginForm.get('password')?.value;

    // Determine if the identifier is an email (contains '@').
    const isEmail = identifier?.includes('@');

    try {
      if (isEmail) {
        this.currentAuthMethod = 'email'; // Set authentication method to email.
        this.loading.email = true; // Set loading state for email login.

        // Subscribe to the email sign-in observable from AuthService.
        this.authService
          .signInWithEmail(identifier, password)
          .pipe(takeUntil(this.destroy$)) // No operators needed here, as further handling is in the subscribe block.
          .subscribe({
            next: async (response) => {
              // If user data is received, proceed with post-login actions.
              if (response.user) {
                try {
                  const token = await response.user.getIdToken(); // Get Firebase ID token.

                  // Perform parallel tracking and metric logging.
                  await Promise.all([
                    this.trackLoginAttempt('email', true, token),
                    this.loginMetrics(response.user.uid, 'password'),
                  ]);

                  // Update user data and check verification status.
                  const isVerified = await this.onLoginUpdate(response, 'password');
                  if (!isVerified) return; // If not verified, stop here (redirection handled in onLoginUpdate).

                  setUserId(this.analytics, response.user.uid); // Set user ID for analytics.

                  // Show success snackbar and navigate to the dashboard or return URL.
                  this.showSnackbar(this.translate.instant('LOGIN.SIGN_IN_SUCCESS'), SnackBarType.success, '', 3000);
                  const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
                  this.router.navigateByUrl(returnUrl);
                } catch (error) {
                  // Handle errors during token generation or post-login updates.
                  this.handleError(error, 'login:email', 'email');
                  return;
                }
              }
            },
            error: async (error) => {
              this.handleError(error, 'login:email', 'email');
              this.handleAccountExistsError(error, 'password');
            },
            complete: () => {
              this.loading.email = false; // Always reset loading state on completion.
              this.loginInProgress = false;
            }
          });
      }
    } finally {
      this.loginInProgress = false;
    }
  }

  /**
   * @description Initiates the Google login process.
   * Uses Firebase's GoogleAuthProvider to sign in with a popup.
   */
  public async loginWithGoogle(): Promise<void> {
    if (this.loginInProgress) return;
    
    // Check if running in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Google sign-in not available during SSR');
      return;
    }
    
    this.loginInProgress = true;
    this.loading.google = true; // Set loading state for Google login.
    this.errorMessage = ''; // Clear any previous error messages.

    try {
      // Use the AuthService to handle Google sign-in.
      this.authService.signInWithGoogle(this.googleProvider)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (response) => {
            // If user data is received, proceed with post-login actions.
            if (response.user) {
              try {
                // Update user profile with display name and photo URL if available.
                if (response.user.displayName || response.user.photoURL) {
                  await updateProfile(response.user, {
                    displayName: response.user.displayName,
                    photoURL: response.user.photoURL || DEFAULT_PROFILE_URL, // Use default if photoURL is null.
                  });
                }

                const token = await response.user.getIdToken(); // Get Firebase ID token.

                // Perform parallel tracking, metric logging, and user data storage.
                await Promise.all([
                  this.trackLoginAttempt('google.com', true, token),
                  this.loginMetrics(response.user.uid, 'google.com'),
                  this.firestoreService.storeUserData(response.user, 'google.com', true),
                  setUserId(this.analytics, response.user.uid) // Set user ID for analytics.
                ]);

                // Show success snackbar and navigate to the dashboard or return URL.
                this.showSnackbar(this.translate.instant('LOGIN.SIGN_IN_SUCCESS'), SnackBarType.success, '', 3000);
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
                this.router.navigateByUrl(returnUrl);
              } catch (error) {
                // Handle errors during token generation or post-login updates.
                this.handleError(error, 'login:google', 'google.com');
                return;
              }
            } else {
              // Handle cases where no user is returned after sign-in.
              await this.trackLoginAttempt('google.com', false);
              this.errorMessage = this.translate.instant('AUTH_ERRORS.USER_NULL_AFTER_SIGNIN');
              this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
            }
          },
          error: async (error) => {
            this.handleError(error, 'login:google', 'google.com');
            this.handleAccountExistsError(error, 'google.com');
            this.cdr.detectChanges();
          },
          complete: () => {
            this.loading.google = false; // Always reset loading state on completion.
            this.loginInProgress = false;
          }
        });
    } catch (error) {
      this.handleError(error, 'login:google', 'google.com');
    } finally {
      this.loginInProgress = false;
    }
  }

  /**
   * @description Initiates the GitHub login process.
   * Uses Firebase's GithubAuthProvider to sign in with a popup.
   */
  public async loginWithGithub(): Promise<void> {
    if (this.loginInProgress) return;
    
    // Check if running in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('GitHub sign-in not available during SSR');
      return;
    }
    
    this.loginInProgress = true;
    this.loading.github = true; // Set loading state for GitHub login.
    this.errorMessage = ''; // Clear any previous error messages.

    try {
      // Use the AuthService to handle GitHub sign-in.
      this.authService.signInWithGitHub(this.githubProvider)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (response) => {
            // If user data is received, proceed with post-login actions.
            if (response.user) {
              try {
                // Update user profile with display name and photo URL if available.
                if (response.user.displayName || response.user.photoURL) {
                  await updateProfile(response.user, {
                    displayName: response.user.displayName,
                    photoURL: response.user.photoURL ? response.user.photoURL : DEFAULT_PROFILE_URL, // Use default if photoURL is null.
                  });
                }
                const token = await response.user.getIdToken(); // Get Firebase ID token.

                // Perform parallel tracking, metric logging, and user data storage.
                await Promise.all([
                  this.trackLoginAttempt('github.com', true, token),
                  this.loginMetrics(response.user.uid, 'github.com'),
                  this.firestoreService.storeUserData(response.user, 'github.com', true),
                  setUserId(this.analytics, response.user.uid) // Set user ID for analytics.
                ]);

                // Show success snackbar and navigate to the dashboard or return URL.
                this.showSnackbar(this.translate.instant('LOGIN.SIGN_IN_SUCCESS'), SnackBarType.success, '', 3000);
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
                this.router.navigateByUrl(returnUrl);
              } catch (error) {
                // Handle errors during token generation or post-login updates.
                this.handleError(error, 'login:github', 'github.com');
                return;
              }
            }
          },
          error: async (error) => {
            this.handleError(error, 'login:github', 'github.com');
            this.handleAccountExistsError(error, 'github.com');
          },
          complete: () => {
            this.loading.github = false; // Always reset loading state on completion.
            this.loginInProgress = false;
          }
        });
    } catch (error) {
      this.handleError(error, 'login:github', 'github.com');
      this.loading.github = false;
      this.loginInProgress = false;
    }
  }

  /**
   * @description Handles the Firebase 'auth/account-exists-with-different-credential' error.
   * Displays a warning message to the user, prompting them to link their accounts.
   * @param {any} error - The error object returned by Firebase authentication.
   * @param {string} providerId - The ID of the provider that caused the error (e.g., 'google.com', 'github.com').
   */
  private handleAccountExistsError(error: any, providerId: string): void {
    const errorCode: string = error?.code as string;

    if (errorCode === 'auth/account-exists-with-different-credential') {
      // The original code tried to extract and use the credential directly, which is generally not
      // recommended for direct handling in the frontend due to security implications and complexity.
      // Instead, we rely on the `getErrorMessage` utility to provide a user-friendly message.
      this.errorMessage = getErrorMessage(error, this.translate);
      this.showSnackbar(this.errorMessage, SnackBarType.warning, '', 7000);
    }
  }

  /**
   * @description Attempts to link a pending credential with an existing user account.
   * This is typically used when a user tries to sign in with a new provider,
   * but their email already exists with a different provider.
   * @param {User} user - The Firebase User object to link the credential to.
   * @returns {Promise<UserCredential | null>} A promise that resolves with the UserCredential
   *   if linking is successful, or `null` if no pending credential or an error occurs.
   */
  private async handlePendingCredentialLinking(user: User): Promise<UserCredential | null> {
    if (!this.pendingCredential) {
      return null; // No pending credential to link.
    }

    try {
      // Link the user with the stored pending credential.
      const usercredential = await linkWithCredential(user, this.pendingCredential);
      // this.showSnackbar('Account successfully linked!', SnackBarType.success, '', 3000); // Optional success message.
      this.pendingCredential = null; // Clear the pending credential after successful linking.
      return usercredential;
    } catch (error: any) {
      console.error('Error linking account:', error);
      this.errorMessage = getErrorMessage(error, this.translate);
      // this.showSnackbar(`Error linking account: ${this.errorMessage}`, SnackBarType.error, '', 5000); // Optional error message.
      this.pendingCredential = null; // Clear the pending credential even on error to prevent re-attempts.
      return null; // Return null to indicate that linking failed.
    }
  }

  /**
   * @description Extracts a Firebase authentication error code from a raw error object or string.
   * This method ensures that the error object consistently has a `code` property.
   * @param {any} error - The raw error object or string.
   * @returns {any} The normalized error object with a `code` property.
   */
  private extractFirebaseError(error: any): any {
    // If the error is a string and contains 'auth/', attempt to parse the error code.
    if (typeof error === 'string' && error.toString().includes('auth/')) {
      console.warn('Extracted Firebase error code:', error);
      const match = error.match(/auth\/([^)]+)/); // Regex to find the code.
      if (match && match[1]) {
        // Return a new error object with the extracted code and original message.
        return { code: match[1], message: error };
      }
    }
    return error; // Return the error as is if no parsing is needed or possible.
  }

  /**
   * @description Returns the appropriate Firebase Auth provider based on the provider ID.
   * @param {string} providerId - The ID of the authentication provider (e.g., 'google.com', 'github.com').
   * @returns {any | null} The Firebase Auth provider class or `null` if not found.
   */
  private getProvider(providerId: string): any | null {
    switch (providerId) {
      case GoogleAuthProvider.PROVIDER_ID:
        return GoogleAuthProvider;
      case GithubAuthProvider.PROVIDER_ID:
        return GithubAuthProvider;
      // Add other providers as needed.
      default:
        return null;
    }
  }

  /**
   * @description Sends a phone verification code to the provided phone number.
   * This method uses Firebase PhoneAuthProvider and reCAPTCHA for verification.
   */
  public async sendPhoneVerificationCode(): Promise<void> {
    this.loading.phone = true; // Set loading state for phone verification.
    this.errorMessage = ''; // Clear any previous error messages.
    try {
      const phoneNumber = this.loginForm.get('identifier')?.value;
      if (!phoneNumber) {
        throw new Error('Phone number is required.');
      }
      // Use AuthService to send the phone verification code.
      this.confirmationResult = await this.authService.signInWithPhone(phoneNumber, this.recaptchaVerifier);
      this.phoneVerificationSent = true; // Indicate that the code has been sent.
      this.showSnackbar(this.translate.instant('AUTH_ERRORS.PHONE_VERIFICATION_SENT'), SnackBarType.success);
    } catch (error: any) {
      this.handleError(error, 'sendPhoneVerificationCode', 'phone');
      this.cdr.detectChanges();
      this.resetAuthFlow();
    } finally {
      this.loading.phone = false; // Always reset loading state.
    }
  }

  /**
   * @description Verifies the phone number using the code sent via SMS.
   * This is the second step in the phone authentication flow.
   */
  public async verifyPhoneNumberCode(): Promise<void> {
    this.loading.code = true; // Set loading state for code verification.
    this.errorMessage = ''; // Clear any previous error messages.
    try {
      // Assuming 'verificationCode' control exists if phone login is active.
      // If not, this part needs to be guarded or modified.
      const verificationCode = this.loginForm.get('verificationCode')?.value;
      if (!verificationCode) {
        throw new Error('Verification code is required.');
      }
      // Use AuthService to verify the phone code.
      const userCredential = await this.authService.verifyPhoneCode(this.confirmationResult.verificationId, verificationCode);

      // If user credential is valid, proceed with post-verification actions.
      if (userCredential.user) {
        let userData = await this.firestoreService.getUserData(userCredential.user.uid);
        if (userData) {
          const token = await userCredential.user.getIdToken(); // Get Firebase ID token.
          await this.trackLoginAttempt('phone', true, token);

          // Store updated user data in Firestore (Firebase automatically marks phone as verified).
          await this.firestoreService.storeUserData(userCredential.user, 'phone', true);

          if (!userCredential.user.phoneNumber) {
            await this.trackLoginAttempt('phone', false);
            this.showSnackbar(this.translate.instant('AUTH_ERRORS.PHONE_NUMBER_NOT_FOUND'), SnackBarType.error, '', 5000);
            this.resetAuthFlow();
            return;
          }

          this.showSnackbar(this.translate.instant('AUTH_ERRORS.PHONE_VERIFIED_SUCCESS'), SnackBarType.success);
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        } else {
          await this.trackLoginAttempt('phone', false);
          this.showSnackbar(this.translate.instant('AUTH_ERRORS.SIGN_IN_FAILED_USER_DATA_NOT_FOUND'), SnackBarType.error, '', 3000);
          this.resetAuthFlow();
        }
      } else {
        await this.trackLoginAttempt('phone', false);
        this.errorMessage = this.translate.instant('AUTH_ERRORS.USER_NULL_AFTER_PHONE_VERIFICATION');
        this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
        this.resetAuthFlow();
      }
    } catch (error: any) {
      this.handleError(error, 'verifyPhoneNumberCode', 'code');
      this.cdr.detectChanges();
      this.resetAuthFlow();
    } finally {
      this.loading.code = false; // Always reset loading state.
    }
  }

  /**
   * @description Resets the phone authentication flow, clearing form, error messages,
   * and reCAPTCHA.
   */
  public resetAuthFlow(): void {
    this.currentAuthMethod = null;
    this.phoneVerificationSent = false;
    this.loginForm.reset(); // Reset form fields.
    this.errorMessage = ''; // Clear error message.

    this.recaptchaVerifier?.clear(); // Clear reCAPTCHA state.
    this.recaptchaVerifier?.render(); // Re-render reCAPTCHA for the next attempt.
  }

  /**
   * @description Performs post-login updates to user data in Firestore and handles
   * redirection if the user's email or phone is not verified.
   * @param {Pick<loginCredentials, 'user'>} response - The login response containing the Firebase User object.
   * @param {string} providerId - The ID of the authentication provider.
   * @returns {Promise<boolean>} A promise that resolves to `true` if the user is verified and can proceed, `false` otherwise.
   */
  private async onLoginUpdate(response: Pick<loginCredentials, 'user'>, providerId: string): Promise<boolean> {
    const userData = await this.firestoreService.getUserData(response.user.uid);

    // If no user data is found, something went wrong, prevent further processing.
    if (!userData) return false;

    let updateUser = false; // Flag to determine if user data needs to be updated.

    // Update email verification status if it has changed in Firebase.
    if (!userData.emailVerified && response.user.emailVerified) {
      userData.emailVerified = true;
      updateUser = true;
    }

    // Update providerId if the current login provider is different from the stored one.
    if (userData.providerId !== providerId) {
      updateUser = true;
    }

    // Store updated user data in Firestore if any changes were detected.
    if (updateUser) {
      await this.firestoreService.storeUserData(
        response.user,
        providerId || userData.providerId, // Use current providerId or existing if not provided.
        response.user.emailVerified,
        userData.username
      );
    }

    // Redirect to verification page if neither email nor phone is verified.
    if (!response.user.emailVerified || userData.phoneVerified === false) {
      this.showSnackbar(
        this.translate.instant('AUTH_ERRORS.EMAIL_OR_PHONE_NOT_VERIFIED'),
        SnackBarType.warning,
        '',
        5000
      );
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigate(['/service/verification'], { queryParams: { returnUrl } });
      return false; // Indicate that verification is pending.
    }

    return true; // User is verified and can proceed.
  }

  /**
   * @description Records login metrics, links guest sessions to authenticated users,
   * and updates cookies.
   * @param {string} userId - The Firebase UID of the authenticated user.
   * @param {string} providerId - The ID of the authentication provider (e.g., 'google.com', 'password').
   * @returns {Promise<void>} A promise that resolves when metrics are recorded and cookies updated.
   */
  public async loginMetrics(userId: string, providerId: string): Promise<void> {
    let guestId = this.cookieService.get('gid'); // Get guest_id from cookies
    let aid = this.cookieService.get('aid'); // Get authenticated user cookie
    let guestfp = this.cookieService.get('guest_fp'); // Get guest fingerprint from cookies

    let guestInfo: Guest | null = null;
    // Get device fingerprint from localStorage or generate
    const fingerprintData = guestfp

    if (guestId) {
      const { err, guestInfo: GuestData } = await this.authService.linkGuestToUser(userId, guestId);

      guestInfo = GuestData;
      if (err) {
        console.error('Error linking guest to user:', err);
        throw err; // Propagate the error
      }

      this.cookieService.delete('gid'); // Clear the guest_id cookie
      this.cookieService.set('aid', JSON.stringify({ userId, guestId }), 90, "/", "", true, "Lax"); // Set authenticated user cookie for 1 year
    }

    // Record login metrics
    const connection = (this.navigator as any)?.connection?.effectiveType || null; // e.g. "wifi", "4g"
    const ipAddress = '0.0.0.0'; // Placeholder, ideally obtained from a backend service
    const browser = await getBrowser(this.navigator) || 'Unknown';
    const userAgent = this.navigator.userAgent || 'Unknown';
    const location = 'Unknown'; // Placeholder, ideally obtained from a geolocation service
    const deviceType = this.navigator?.platform || 'Unknown';
    const deviceFingerprintHash = await getDeviceFingerprintHash(fingerprintData, this.window);

    const metrics: Partial<loginHistoryInfo> = {
      ipAddress,
      browser,
      userAgent,
      location,
      deviceType,
      connection,
      providerId,
      deviceFingerprintHash,
    };

    const currlogin = await this.authService.recordLoginMetrics(userId, metrics, guestInfo || undefined);

    if (currlogin?.success && currlogin?.loginId) {
      // Store loginId in localStorage for future reference (e.g., logout)
      this.localStorage.setItem('loginId', currlogin.loginId);
      if (aid) {
        const aidData = cleanAndParseJSON(aid) as { userId: string, guestId: string, loginId?: string };
        const newAidData = { ...aidData, loginId: currlogin.loginId };
        // Extend authenticated user cookie expiration if exists
        this.cookieService.set('aid', JSON.stringify(newAidData), 90, '/', "", true, "Lax");
      }
    }
  }

  /**
   * @description Lifecycle hook that is called when the component is destroyed.
   * Unsubscribes from all active subscriptions to prevent memory leaks and clears reCAPTCHA.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.recaptchaVerifier?.clear();
  }
}
