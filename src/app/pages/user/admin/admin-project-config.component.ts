import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-admin-project-config',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="p-6 max-w-4xl">
      <h1 class="text-3xl font-bold mb-6">Project Configuration</h1>

      <!-- TOTP MFA Enablement Card -->
      <mat-card class="mb-6">
        <mat-card-header>
          <mat-card-title>Multi-Factor Authentication (MFA)</mat-card-title>
          <mat-card-subtitle>Enable TOTP authenticator app support</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p class="text-gray-600 mb-4">
            Enable TOTP (Time-based One-Time Password) authentication to allow users to enroll
            authenticator apps like Google Authenticator, Microsoft Authenticator, or Authy.
          </p>

          <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <div>
              <p class="font-semibold text-blue-900">TOTP Status</p>
              <p class="text-sm text-blue-700">{{ totpEnabled ? '✅ Enabled' : '⏳ Not Enabled' }}</p>
            </div>
            <button
              mat-raised-button
              color="primary"
              (click)="enableTotp()"
              [disabled]="isLoading || isStatusLoading || totpEnabled"
              class="!rounded-lg"
            >
              <mat-spinner *ngIf="isLoading" diameter="20" class="mr-2"></mat-spinner>
              {{ totpEnabled ? 'Already Enabled' : 'Enable TOTP MFA' }}
            </button>
          </div>

          <div *ngIf="successMessage" class="p-3 bg-green-50 border border-green-200 rounded text-green-700 mb-4">
            ✅ {{ successMessage }}
          </div>

          <div *ngIf="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded text-red-700">
            ❌ {{ errorMessage }}
          </div>
          <div *ngIf="isStatusLoading" class="p-3 bg-gray-50 border border-gray-200 rounded text-gray-700 mb-4">
            Checking current project MFA status...
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProjectConfigComponent implements OnInit {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = false;
  isStatusLoading = false;
  totpEnabled = false;
  successMessage = '';
  errorMessage = '';

  async ngOnInit(): Promise<void> {
    await this.loadTotpStatus()
  }

  async loadTotpStatus(): Promise<void> {
    this.isStatusLoading = true
    this.errorMessage = ''
    this.successMessage = ''
    this.cdr.detectChanges()

    try {
      const status = await this.authService.getTotpMfaProjectStatus()
      this.totpEnabled = status.status === 'enabled' || status.status === 'already-enabled'
      this.successMessage = status.message
    } catch (error: any) {
      this.errorMessage = error?.message || 'Failed to load TOTP MFA project status'
    } finally {
      this.isStatusLoading = false
      this.cdr.detectChanges()
    }
  }

  async enableTotp(): Promise<void> {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges()

    try {
      const result = await this.authService.enableTotpMfaForProject();
      this.totpEnabled = result.status === 'enabled' || result.status === 'already-enabled';
      this.successMessage = result.message || 'TOTP MFA has been enabled successfully!';
      console.log('TOTP MFA enabled:', result);
    } catch (error: any) {
      this.errorMessage = error?.message || 'Failed to enable TOTP MFA';
      console.error('TOTP enablement error:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges()
    }
  }
}
