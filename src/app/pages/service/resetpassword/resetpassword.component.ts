import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { getErrorMessage } from 'src/app/core/functions';
import { FirestoreService } from 'src/app/core/services';
import { AnimatedBgComponent } from 'src/app/shared';

@Component({
    selector: 'app-resetpassword',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatIconModule,
        MatProgressSpinnerModule,
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
        private fireService: FirestoreService
    ) {
        this.resetPasswordForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    get email() {
        return this.resetPasswordForm.get('email');
    }

    ngOnInit(): void { }

    async resetPassword() {
        if (this.resetPasswordForm.valid) {
            this.loading = true;
            this.errorMessage = '';

            try {
                const email = this.resetPasswordForm.get('email')?.value;
                await this.fireService.sendPasswordResetEmail(email)

                this.resetEmailSent = true;
            } catch (error: any) {
                this.errorMessage = getErrorMessage(error);
            } finally {
                this.loading = false;
            }
        }
    }

    // private getErrorMessage(error: any): string {
    //     switch (error.code) {
    //         case 'auth/user-not-found':
    //             return 'No user found with this email address.';
    //         case 'auth/invalid-email':
    //             return 'Invalid email address.';
    //         case 'auth/too-many-requests':
    //             return 'Too many reset attempts. Please try again later.';
    //         default:
    //             return 'An error occurred. Please try again.';
    //     }
    // }
}
