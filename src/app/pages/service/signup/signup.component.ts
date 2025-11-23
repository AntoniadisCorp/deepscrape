import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithPopup, User, UserCredential, sendEmailVerification, verifyBeforeUpdateEmail, updateProfile, updatePhoneNumber, linkWithPhoneNumber, fetchSignInMethodsForEmail, linkWithCredential, GithubAuthProvider, OAuthProvider } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Users, Loading } from 'src/app/core/types';
import { checkPasswordStrength, getErrorMessage } from 'src/app/core/functions';
import { FirestoreService, SnackbarService, AuthService } from 'src/app/core/services';
import { DEFAULT_PROFILE_URL } from 'src/app/core/variables';
import { createPasswordStrengthValidator } from 'src/app/core/directives';
import { SnackBarType } from 'src/app/core/components';
import { Subscription } from 'rxjs';
import { CookieService } from 'ngx-cookie-service'; // Import CookieService
import { AnimatedBgComponent } from 'src/app/shared';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { I18nService } from 'src/app/core/i18n';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// First, create an interface for your form structure
interface SignupForm {
    name: FormControl<string | null>;
    email: FormControl<string | null>;
    password: FormControl<string | null>;
    confirmPassword: FormControl<string | null>;
    phoneNumber: FormControl<string | null>;
}

@Component({
    selector: 'app-signup',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TranslateModule,
    ],
    templateUrl: './signup.component.html',
    styleUrl: './signup.component.scss'
})
export class SignupComponent implements OnInit, OnDestroy {
    signupForm: FormGroup
    emailCheckSubs: Subscription
    loading: Loading = {
        github: false,
        logout: false,
        google: false,
        email: false,
        phone: false,
        code: false,
        password: false,
        mfa: false
        
    };
    errorMessage = '';
    private destroyRef = inject(DestroyRef);
    private langChangeSubscription: Subscription;

    constructor(
        private fb: FormBuilder,
        private auth: Auth,
        private firestore: Firestore,
        private router: Router,
        private firestoreService: FirestoreService,
        private snackbarService: SnackbarService,
        private authService: AuthService, // Inject AuthService
        private cookieService: CookieService, // Inject CookieService
        private translate: TranslateService, // Inject TranslateService
        private i18nService: I18nService, // Inject I18nService
    ) {
    }

    ngOnInit(): void {
        this.translate.use(this.i18nService.currentLang());
        this.langChangeSubscription = this.i18nService.currentLang$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((lang) => {
                this.translate.use(lang);
            });
        this.signupForm = this.fb.group<SignupForm>({
            name: this.fb.control('', {
                validators: [Validators.required, Validators.minLength(2)],
                nonNullable: false
            }),
            email: this.fb.control('', {
                validators: [Validators.required, Validators.email],
                nonNullable: false
            }),
            password: this.fb.control('', {
                validators: [
                    Validators.required,
                    Validators.minLength(8),
                    createPasswordStrengthValidator(),
                ],
                updateOn: 'blur',
                nonNullable: false
            }),
            confirmPassword: this.fb.control('', {
                validators: [Validators.required],
                nonNullable: false
            }),
            phoneNumber: this.fb.control('', {
                validators: [Validators.pattern(/^\+?[1-9]\d{1,14}$/)],
                nonNullable: false
            }),
        }, {
            validators: this.passwordMatchValidator
        });
    }

    passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
        const form = control as FormGroup;
        const password = form.get('password');
        const confirmPassword = form.get('confirmPassword');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        } else {
            if (confirmPassword?.hasError('passwordMismatch')) {
                confirmPassword.setErrors(null);
            }
            return null;
        }
    }

   
    protected checkPasswordStrength(password: string): string {

        return checkPasswordStrength(password)
    }

    async signup() {
        this.errorMessage = ''
        let confirmationResult: any = null
        if (this.signupForm.valid) {

            const { email, confirmPassword, name, phoneNumber } = this.signupForm.value


            // Check if the email already exists
            this.emailCheckSubs = this.authService.checkUserEmailForDifferentProvider(email).subscribe({                next: async (response) => {
                    try {
                        if (response.exists) {
                            this.errorMessage = this.translate.instant('SIGNUP.EMAIL_ALREADY_EXISTS')
                            this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000)
                            return
                        }

                        const userCredential = await createUserWithEmailAndPassword(this.auth, email, confirmPassword) as UserCredential
                        // Verify email after signup
                        await sendEmailVerification(userCredential.user)

                        // console.log('Email verification sent to:', userCredential.user)

                        // Store additional user info in Firestore
                        if (userCredential.user) {

                            await updateProfile(userCredential.user, {
                                displayName: name || userCredential.user.email?.split('@')[0] || '',
                                photoURL: DEFAULT_PROFILE_URL,
                            })

                            if (phoneNumber) {
                                // If phone number is provided, link it to the user
                                confirmationResult = await linkWithPhoneNumber(userCredential.user, phoneNumber)
                            }
                            console.log('User profile updated:', userCredential.user.providerData,
                                userCredential.user.displayName)

                            await this.firestoreService.storeUserData(userCredential.user, "password", false, null, phoneNumber ? false : null)
                        }

                        // Redirect or show success message
                        this.router.navigate(['/service/verification'], { state: { 
                            verificationId: confirmationResult?.verificationId, 
                            phoneNumber, 
                            email: userCredential.user.email 
                        } });
                    } catch (error: any) {
                        this.errorMessage = getErrorMessage(error, this.translate)
                        this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000)
                    }
                },
                error: (error) => {
                    this.errorMessage = getErrorMessage(error, this.translate)
                    this.showSnackbar(error.message, SnackBarType.error, '', 5000)
                }

            })
        }
    }
    // 'info' | 'success' | 'warning' | 'error'
    showSnackbar(
        message: string,
        type: SnackBarType = SnackBarType.info,
        action: string | '' = '',
        duration: number = 3000) {

        this.snackbarService.showSnackbar(message, type, action, duration)
    }    ngOnDestroy(): void {
        //Called once, before the instance is destroyed.
        //Add 'implements OnDestroy' to the class.
        this.emailCheckSubs?.unsubscribe()
        this.langChangeSubscription?.unsubscribe()
    }
}
