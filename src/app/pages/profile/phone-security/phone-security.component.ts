import { Component, OnInit, inject, DestroyRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth, RecaptchaVerifier } from '@angular/fire/auth';
import { AuthService, FirestoreService, SnackbarService, ThemeService } from 'src/app/core/services';
import { Users, Loading } from 'src/app/core/types';
import { SnackBarType } from 'src/app/core/components';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { getErrorMessage } from 'src/app/core/functions';

@Component({
  selector: 'app-phone-security',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './phone-security.component.html',
  styleUrls: ['./phone-security.component.scss']
})
export class PhoneSecurityComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private themePicker = inject(ThemeService);
  private platformId = inject<Object>(PLATFORM_ID);
  protected isDarkMode$: Observable<boolean> = this.themePicker.isDarkMode$;

  phoneForm: FormGroup;
  verificationForm: FormGroup;
  currentUser: Users | null = null;
  loading: Loading = {
    phone: false,
    code: false,
    remove: false,
    github: false,
    logout: false,
    google: false,
    email: false,
    password: false,
    mfa: false
  };

  errorMessage = '';
  successMessage = '';
  showVerificationInput = false;
  recaptchaVerifier!: RecaptchaVerifier;
  confirmationResult: any;
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private auth: Auth,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Recaptcha is not available in non-browser environment.');
      return;
    }
    this.initializeRecaptcha();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.phoneForm = this.formBuilder.group({
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^\+[1-9]\d{1,14}$/)
      ]]
    });

    this.verificationForm = this.formBuilder.group({
      verificationCode: ['', [
        Validators.required,
        Validators.pattern(/^\d{6}$/)
      ]]
    });
  }

  private loadCurrentUser(): void {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user?.phoneNumber) {
          this.phoneForm.patchValue({ phoneNumber: user.phoneNumber });
        }
      });
  }

  private initializeRecaptcha(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Initialize reCAPTCHA for phone verification
    this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        this.showSnackbar(
          this.translate.instant('PHONE_SECURITY.RECAPTCHA_EXPIRED'),
          SnackBarType.warning
        );
      }
    });
  }

  /**
   * Add or update phone number
   */
  async addPhoneNumber(): Promise<void> {
    if (!this.phoneForm.valid) return;

    this.loading.phone = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const phoneNumber = this.phoneForm.get('phoneNumber')?.value;

      // Check if phone number is available
      const availability = await this.authService.checkPhoneNumberAvailability(phoneNumber).toPromise();
      
      if (!availability?.available) {
        throw new Error(this.translate.instant('PHONE_SECURITY.PHONE_NUMBER_EXISTS'));
      }

      // Send SMS verification
      this.confirmationResult = await this.authService.linkPhoneNumber(phoneNumber, this.recaptchaVerifier);
      this.showVerificationInput = true;

      this.showSnackbar(
        this.translate.instant('PHONE_SECURITY.CODE_SENT'),
        SnackBarType.success
      );

    } catch (error: any) {
      console.error('Phone number addition error:', error);
      this.errorMessage = getErrorMessage(error, this.translate);
      this.showSnackbar(this.errorMessage, SnackBarType.error);
    } finally {
      this.loading.phone = false;
    }
  }

  /**
   * Verify phone number with SMS code
   */
  async verifyPhoneNumber(): Promise<void> {
    if (!this.verificationForm.valid) return;

    this.loading.code = true;
    this.errorMessage = '';

    try {
      const verificationCode = this.verificationForm.get('verificationCode')?.value;
      
      // Confirm the verification code
      await this.confirmationResult.confirm(verificationCode);

      if (this.currentUser) {
        await this.authService.updatePhoneVerificationStatus(this.currentUser.uid, true).toPromise();
        
        // Refresh user data
        await this.authService.refreshUserData();
      }

      this.successMessage = this.translate.instant('PHONE_SECURITY.PHONE_VERIFIED');
      this.showVerificationInput = false;
      this.verificationForm.reset();

      this.showSnackbar(
        this.translate.instant('PHONE_SECURITY.PHONE_ADDED_SUCCESS'),
        SnackBarType.success
      );

    } catch (error: any) {
      console.error('Phone verification error:', error);
      this.errorMessage = getErrorMessage(error, this.translate);
      this.showSnackbar(this.errorMessage, SnackBarType.error);
    } finally {
      this.loading.code = false;
    }
  }

  /**
   * Remove phone number from account
   */
  async removePhoneNumber(): Promise<void> {
    if (!this.currentUser?.phoneNumber) return;

    const confirmRemoval = confirm(this.translate.instant('PHONE_SECURITY.CONFIRM_REMOVE'));
    if (!confirmRemoval) return;

    this.loading.remove = true;

    try {
      await this.authService.unlinkProvider('phone');
      await this.authService.updatePhoneVerificationStatus(this.currentUser.uid).toPromise();
      
      // Refresh user data
      await this.authService.refreshUserData();

      this.phoneForm.reset();
      this.showSnackbar(
        this.translate.instant('PHONE_SECURITY.PHONE_REMOVED_SUCCESS'),
        SnackBarType.success
      );

    } catch (error: any) {
      console.error('Phone removal error:', error);
      this.errorMessage = getErrorMessage(error, this.translate);
      this.showSnackbar(this.errorMessage, SnackBarType.error);
    } finally {
      this.loading.remove = false;
    }
  }

  /**
   * Cancel verification process
   */
  cancelVerification(): void {
    this.showVerificationInput = false;
    this.verificationForm.reset();
    this.confirmationResult = null;
  }

  /**
   * Resend verification code
   */
  async resendCode(): Promise<void> {
    await this.addPhoneNumber();
  }

  /**
   * Show snackbar message
   */
  private showSnackbar(message: string, type: SnackBarType = SnackBarType.info): void {
    this.snackbarService.showSnackbar(message, type, '', 4000);
  }

  /**
   * Get form control for easier template access
   */
  get phoneControl() {
    return this.phoneForm.get('phoneNumber');
  }

  get codeControl() {
    return this.verificationForm.get('verificationCode');
  }

  /**
   * Check if phone number is already verified
   */
  get isPhoneVerified(): boolean {
    return this.currentUser?.phoneVerified === true;
  }

  /**
   * Check if user has a phone number
   */
  get hasPhoneNumber(): boolean {
    return !!this.currentUser?.phoneNumber;
  }
}
