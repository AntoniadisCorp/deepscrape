import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';

@Component({
    selector: 'app-resetpassword',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './resetpassword.component.html',
    styleUrl: './resetpassword.component.scss'
})
export class ResetPasswordComponent implements OnInit {
    resetPasswordForm: FormGroup;
    loading = false;
    resetEmailSent = false;
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private auth: Auth
    ) {
        this.resetPasswordForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    ngOnInit(): void { }

    async resetPassword() {
        if (this.resetPasswordForm.valid) {
            this.loading = true;
            this.errorMessage = '';

            try {
                const email = this.resetPasswordForm.get('email')?.value;
                await sendPasswordResetEmail(this.auth, email);

                this.resetEmailSent = true;
            } catch (error: any) {
                this.errorMessage = this.getErrorMessage(error);
            } finally {
                this.loading = false;
            }
        }
    }

    private getErrorMessage(error: any): string {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No user found with this email address.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/too-many-requests':
                return 'Too many reset attempts. Please try again later.';
            default:
                return 'An error occurred. Please try again.';
        }
    }
}
