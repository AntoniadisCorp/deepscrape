import { Component, OnInit, OnDestroy, AfterViewInit, Inject, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { applyActionCode, Auth, sendEmailVerification, updateCurrentUser, User, RecaptchaVerifier, ConfirmationResult, PhoneAuthProvider, linkWithCredential } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthService, FirestoreService, SnackbarService } from 'src/app/core/services';
import { SnackBarType } from 'src/app/core/components';
import { MatIcon } from '@angular/material/icon';
import { delay, finalize, Subscription, timer } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Loading } from 'src/app/core/types';
import { getErrorMessage } from 'src/app/core/functions';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [MatIcon, CommonModule, ReactiveFormsModule],
  templateUrl: './verification.component.html',
  styleUrl: './verification.component.scss'
})
export class VerifyEmailComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('recaptcha') recaptcha: any
  user: User | null = null;
  logoutSubscription: Subscription;
  timerSubscriber: Subscription;
  loading: Loading = {
    email: false,
    logout: false,
    phone: false,
    code: false,
    google: false,
    github: false
  };
  errorMessage: string = '';

  public recaptchaVerifier!: RecaptchaVerifier;
  public confirmationResult!: ConfirmationResult;
  public verificationMethod: 'email' | 'phone' | null = null; // 'email' or 'phone'
  public phoneVerificationForm: FormGroup;

  constructor(
    private auth: Auth,
    private router: Router,
    private snackbarService: SnackbarService,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private fb: FormBuilder,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef
  ) {
    this.phoneVerificationForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit(): void {
    this.user = this.auth.currentUser
    this.checkVerificationStatus()
  }

  ngAfterViewInit(): void {
    this.initializeRecaptcha()
  }

  private initializeRecaptcha(): void {
    // Ensure the recaptcha-verification element is available before initializing
    
    console.log(this.document.getElementById('recaptcha-verification'))
    if (this.document.getElementById('recaptcha-verification')) {
      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-verification', {
        'size': 'invisible',
        'callback': (response: any) => {
          console.log('Recaptcha solved on verification:', response);
          if (this.verificationMethod === 'phone' && this.phoneVerificationForm.get('phoneNumber')?.valid) {
            this.sendPhoneVerificationCode();
          }
        },
        'expired-callback': () => {
          this.showSnackbar('Recaptcha expired, please try again.', SnackBarType.warning);
        }
      });
      this.recaptchaVerifier.render();
    } else {
      console.warn('Recaptcha container element not found. Recaptcha will not be initialized.');
    }
  }

  private async checkVerificationStatus(): Promise<void> {
    if (!this.user) {
      this.router.navigate(['/service/login'])
      return
    }
    this.loading.email = true

    const userData = await this.firestoreService.getUserData(this.user.uid)

    if (this.user.emailVerified && userData?.phoneVerified) {
      this.router.navigate(['/dashboard']); // Both verified, go to dashboard
    } else if (!this.user.emailVerified && userData?.phoneVerified === null) {
      this.verificationMethod = 'email'
    } else if ((userData?.phoneVerified === false || this.user.phoneNumber) && !userData?.phoneVerified) {
      this.verificationMethod = 'phone'
      this.phoneVerificationForm.get('phoneNumber')?.setValue(this.user.phoneNumber)
    } else {
      // User has email verified but no phone number or phone not verified in Firestore
      // Prompt to add/verify phone number if desired, or just proceed to dashboard
      this.verificationMethod = 'phone'; // Default to phone verification if email is verified but phone is not
    }
    this.loading.email = false
    this.cdr.detectChanges(); // Ensure the view updates with the new state
  }

  async sendPhoneVerificationCode() {
    this.loading.phone = true;
    this.errorMessage = '';
    try {
      const phoneNumber = this.phoneVerificationForm.get('phoneNumber')?.value;
      if (!phoneNumber) {
        throw new Error('Phone number is required.');
      }
      
      // If user already has an account, link the phone number
      if (this.user) {
        this.confirmationResult = await this.authService.linkPhoneNumber(phoneNumber, this.recaptchaVerifier);
      } else {
        // This case should ideally not happen if user is redirected from signup/login
        // but as a fallback, try to sign in with phone
        this.confirmationResult = await this.authService.signInWithPhone(phoneNumber, this.recaptchaVerifier);
      }
      console.log('Phone verification code sent:', this.confirmationResult)
      this.showSnackbar('Verification code sent to your phone.', SnackBarType.success);
      this.cdr.detectChanges(); // Ensure the view updates with the new state
    } catch (error: any) {
      console.error('Error sending phone verification code:', error);
      this.errorMessage = getErrorMessage(error);
      this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
    } finally {
      this.loading.phone = false;
    }
  }

  async verifyPhoneNumberCode() {
    this.loading.code = true;
    this.errorMessage = '';
    try {
      const verificationCode = this.phoneVerificationForm.get('verificationCode')?.value;
      if (!verificationCode) {
        throw new Error('Verification code is required.');
      }

      if (!this.confirmationResult) {
        throw new Error('No verification process initiated. Please send code first.');
      }

      const credential = PhoneAuthProvider.credential(this.confirmationResult.verificationId, verificationCode);
      
      let userCredential;
      if (this.user) {
        // If user is already logged in, link the credential
        userCredential = await linkWithCredential(this.user, credential);
      } else {
        // If no user is logged in, sign in with the credential
        userCredential = await this.authService.verifyPhoneCode(this.confirmationResult.verificationId, verificationCode);
      }

      if (userCredential.user) {
        await this.firestoreService.storeUserData(userCredential.user, "phone", true, true); // Update Firestore with phone number and verified status
        this.showSnackbar('Phone number verified successfully!', SnackBarType.success);
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'User object is null after phone verification.';
        this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
      }
    } catch (error: any) {
      console.error('Error verifying phone number code:', error);
      this.errorMessage = getErrorMessage(error);
      this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
    } finally {
      this.loading.code = false;
    }
  }

  resetPhoneVerification() {
    this.phoneVerificationForm.reset();
    this.errorMessage = '';
    this.confirmationResult = null as any; // Reset confirmation result
    this.recaptchaVerifier.clear();
    this.recaptchaVerifier.render();
  }

  async resendVerificationEmail() {
    this.loading.email = true;
    try {
      if (this.auth.currentUser) {
        await sendEmailVerification(this.auth.currentUser);
        this.showSnackbar('Verification Email sent!', SnackBarType.info, '', 5000);
      } else {
        this.router.navigate(['/service/login']);
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      this.errorMessage = getErrorMessage(error);
      this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000);
    } finally {
      this.loading.email = false;
    }
  }

  goToLogin() {
    this.loading.logout = true; // Using email loading for general logout
    this.logoutSubscription = this.authService.logout().pipe(
      delay(1000),
      finalize(() => {
        this.loading.logout = false;
      })
    ).subscribe({
      next: () => {
        this.timerSubscriber = timer(300).subscribe(() => {
          this.router.navigate(['/service/login']);
        });
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.showSnackbar(getErrorMessage(error), SnackBarType.error, '', 5000);
      }
    })
  }

  showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000
  ) {
    this.snackbarService.showSnackbar(message, type, action, duration);
  }

  ngOnDestroy(): void {
    this.logoutSubscription?.unsubscribe();
    this.timerSubscriber?.unsubscribe();
    this.user = null;
    this.recaptchaVerifier?.clear()
  }
}
