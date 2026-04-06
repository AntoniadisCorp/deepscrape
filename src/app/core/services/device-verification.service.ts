import { Injectable, inject, signal, Signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs'
import { environment } from 'src/environments/environment'
import { FirestoreService } from './firestore.service'
import { Timestamp } from '@angular/fire/firestore'

/**
 * PHASE 4.2: Device Verification Service
 * Detects new devices and requires verification (email/SMS confirmation)
 */
export interface DeviceFingerprint {
  userAgent: string
  ipAddress: string
  deviceId: string
  timestamp: Date
}

export interface TrustedDevice {
  deviceId: string
  deviceName: string
  fingerprint: DeviceFingerprint
  trustedAt: Date
  lastUsedAt: Date
  browser: string
  os: string
  location: string
}

export interface SendVerificationCodeResult {
  success: boolean
  expiresAt?: string
  message?: string
  deliveryStatus?: 'sent' | 'pending_client_mfa'
  hasPhoneNumber?: boolean
  hasMfaEnabled?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class DeviceVerificationService {
  private firestore = inject(FirestoreService)
  private http = inject(HttpClient)

  readonly requiresVerification = signal(false)
  readonly pendingDeviceId = signal('')
  readonly verificationCode = signal('')
  readonly verificationExpiry = signal<Date | null>(null)

  /**
   * Compute device fingerprint from browser
   */
  getDeviceFingerprint(): DeviceFingerprint {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('Device Fingerprint', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
      ctx.fillText('Device Fingerprint', 4, 17)
    }
    const canvasHash = canvas.toDataURL()

    // Generate device ID based on fingerprint
    const navigatorInfo = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`
    const deviceId = this.hashString(navigatorInfo + canvasHash)

    return {
      userAgent: navigator.userAgent,
      ipAddress: '', // Will be filled by backend
      deviceId,
      timestamp: new Date()
    }
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId: string, fingerprint: DeviceFingerprint): Promise<boolean> {
    try {
      // Query user's trustedDevices collection
      const trustedDevices = await this.firestore.callFunction<
        { userId: string; deviceId: string },
        { trusted: boolean }
      >('isDeviceTrusted', {
        userId,
        deviceId: fingerprint.deviceId
      })
      return trustedDevices.trusted || false
    } catch (error) {
      console.error('Failed to check device trust:', error)
      return false
    }
  }

  /**
   * Send device verification code
   */
  async sendVerificationCode(userId: string, method: 'email' | 'sms'): Promise<SendVerificationCodeResult> {
    try {
      const result = await this.firestore.callFunction<
        { userId: string; method: string },
        SendVerificationCodeResult
      >('sendDeviceVerificationCode', {
        userId,
        method
      })

      if (result.success && result.expiresAt) {
        this.verificationExpiry.set(new Date(result.expiresAt))
      }
      return result
    } catch (error) {
      console.error('Failed to send verification code:', error)
      return {
        success: false,
        message: 'Failed to send verification code'
      }
    }
  }

  /**
   * Verify device and add to trusted list
   */
  async verifyDevice(userId: string, code: string, deviceName: string): Promise<boolean> {
    try {
      const fingerprint = this.getDeviceFingerprint()
      const result = await this.firestore.callFunction<
        { userId: string; code: string; deviceId: string; deviceName: string },
        { success: boolean; trustedUntil: string }
      >('verifyAndTrustDevice', {
        userId,
        code,
        deviceId: fingerprint.deviceId,
        deviceName
      })

      if (result.success) {
        this.requiresVerification.set(false)
        this.pendingDeviceId.set('')
        this.verificationCode.set('')
        this.verificationExpiry.set(null)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to verify device:', error)
      return false
    }
  }

  /**
   * Get list of trusted devices
   */
  getTrustedDevices(userId: string): Observable<TrustedDevice[]> {
    return from(
      this.firestore.callFunction<
        { userId: string },
        { devices: TrustedDevice[] }
      >('getTrustedDevices', { userId })
    ).pipe(
      map(response => response.devices)
    )
  }

  /**
   * Remove device from trusted list
   */
  async removeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const result = await this.firestore.callFunction<
        { userId: string; deviceId: string },
        { success: boolean }
      >('removeTrustedDevice', { userId, deviceId })
      return result.success || false
    } catch (error) {
      console.error('Failed to remove trusted device:', error)
      return false
    }
  }

  /**
   * Simple string hash for device fingerprint
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}
