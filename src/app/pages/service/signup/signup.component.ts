import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithPopup, User, UserCredential, sendEmailVerification, verifyBeforeUpdateEmail, updateProfile, updatePhoneNumber, linkWithPhoneNumber, fetchSignInMethodsForEmail, linkWithCredential, GithubAuthProvider, OAuthProvider } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Users, Loading } from 'src/app/core/types';
import { getErrorMessage } from 'src/app/core/functions';
import { FirestoreService, SnackbarService, AuthService } from 'src/app/core/services';
import { DEFAULT_PROFILE_URL } from 'src/app/core/variables';
import { createPasswordStrengthValidator } from 'src/app/core/directives';
import { SnackBarType } from 'src/app/core/components';
import { Subscription } from 'rxjs';

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
        MatProgressSpinnerModule
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
        code: false
    };
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private auth: Auth,
        private firestore: Firestore,
        private router: Router,
        private firestoreService: FirestoreService,
        private snackbarService: SnackbarService,
        private authService: AuthService // Inject AuthService
    ) {
    }

    ngOnInit(): void { 
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

    /**
   * TODO: comment checkPasswordStrength
   * @description Checks password strength
   * @param password 
   * @returns password strength 
   */
    protected checkPasswordStrength(password: string): string {

        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasNonAlphas = /\W/.test(password)

        // has characters that not permitted
        const hasForbiddenCharacters = /[^\w\s@$!%*?&]/.test(password)

        return (
            password.length < minLength ? "Risky. Password needs to be at least 8 characters long" :
                !hasLowerCase ? "Risky. Password needs at least one lowercase letter" :
                    !hasUpperCase ? "Risky. Password needs at least one uppercase letter" :
                        !hasNumbers ? "Risky. Password needs at least one number" :
                            !hasNonAlphas ? "Risky. Password needs at least one special character" :
                                hasForbiddenCharacters ? "Risky. Dont use characters that are not permitted.." : "Strong as it gets"
        )
    }

    async signup() {
        this.errorMessage = ''
        let confirmationResult: any = null
        if (this.signupForm.valid) {

            const { email, confirmPassword, name, phoneNumber } = this.signupForm.value


            // Check if the email already exists
            this.emailCheckSubs = this.authService.checkUserEmailForDifferentProvider(email).subscribe({
                next: async (response) => {
                    try {
                        if (response.exists) {
                            this.errorMessage = `Email already exists!`
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

                            await this.firestoreService.storeUserData(userCredential.user, "password", false, phoneNumber ? false : null)
                        }

                        // Redirect or show success message
                        this.router.navigate(['/service/verification'], { state: { verificationId: confirmationResult?.verificationId, phoneNumber, email: userCredential.user.email } });
                    } catch (error: any) {
                        this.errorMessage = getErrorMessage(error)
                        this.showSnackbar(this.errorMessage, SnackBarType.error, '', 5000)
                    }
                },
                error: (error) => {
                    this.errorMessage = getErrorMessage(error)
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
    }

    ngOnDestroy(): void {
        //Called once, before the instance is destroyed.
        //Add 'implements OnDestroy' to the class.
        this.emailCheckSubs?.unsubscribe()
    }
}
