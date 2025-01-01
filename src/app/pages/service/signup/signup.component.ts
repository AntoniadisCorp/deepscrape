import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithPopup, User, UserCredential, sendEmailVerification, verifyBeforeUpdateEmail } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Users } from 'src/app/core/types';
import { getErrorMessage, storeUserData } from 'src/app/core/functions';
import { FirestoreService } from 'src/app/core/services';

@Component({
    selector: 'app-signup',
    standalone: true,
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
export class SignupComponent implements OnInit {
    signupForm: FormGroup;
    loading = {
        github: false,
        google: false
    };
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private auth: Auth,
        private firestore: Firestore,
        private router: Router,
        private firestoreService: FirestoreService,
    ) {
        this.firestore = this.firestoreService.getInstanceDB('easyscrape')
        this.signupForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    ngOnInit(): void { }

    passwordMatchValidator(form: FormGroup) {
        const password = form.get('password');
        const confirmPassword = form.get('confirmPassword');

        if (password?.value !== confirmPassword?.value) {
            confirmPassword?.setErrors({ passwordMismatch: true });
        } else {
            confirmPassword?.setErrors(null);
        }

        return null;
    }

    async signup() {
        this.errorMessage = '';
        if (this.signupForm.valid) {
            try {
                const { email, password, name } = this.signupForm.value;

                const userCredential = await createUserWithEmailAndPassword(this.auth, email, password) as UserCredential

                await sendEmailVerification(userCredential.user);

                // Store additional user info in Firestore
                if (userCredential.user) {
                    /* let user: User = {
                        ...userCredential.user,
                        photoURL: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                        displayName: name,
                        phoneNumber: '+306989857331',
                        emailVerified: false
                    }
                    this.auth.updateCurrentUser(user) */
                    await storeUserData(userCredential.user, this.firestore);
                }

                // Redirect or show success message
                this.router.navigate(['/service']);
            } catch (error: any) {
                this.errorMessage = getErrorMessage(error);
            }
        }
    }
}
