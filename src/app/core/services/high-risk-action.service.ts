import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { AuthService } from './auth.service'
import { DeviceVerificationService } from './device-verification.service'

@Injectable({
  providedIn: 'root',
})
export class HighRiskActionService {
  private authService = inject(AuthService)
  private deviceVerificationService = inject(DeviceVerificationService)
  private router = inject(Router)

  async ensureVerified(action: 'unlink_provider' | 'api_key_reveal' | 'billing_change' | 'login'): Promise<boolean> {
    const user = await firstValueFrom(this.authService.user$, { defaultValue: null })
    if (!user?.uid) {
      return false
    }

    const fingerprint = this.deviceVerificationService.getDeviceFingerprint()
    const alreadyTrusted = await this.deviceVerificationService.isDeviceTrusted(user.uid, fingerprint)
    if (alreadyTrusted) {
      return true
    }

    // Device not trusted — redirect to the verification page.
    // After the user verifies, they will be redirected back to returnUrl.
    // The caller will cancel the current operation when we return false,
    // and the user can retry once the device is trusted.
    await this.router.navigate(['/service/device-verification'], {
      queryParams: { action, returnUrl: this.router.url },
    })
    return false
  }
}