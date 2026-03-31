import { inject, Injectable, signal, computed, Signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { cleanAndParseJSON } from 'src/app/core/functions';
import { FirestoreService } from './firestore.service';

/**
 * Centralises guest-session state that was previously scattered across AuthService.
 *
 * The BFF writes an `aid` cookie containing `{ guestId, userId, loginId }` as JSON.
 * This service reads it once (on first access) and exposes reactive signals.
 */
@Injectable({ providedIn: 'root' })
export class GuestTrackingService {
  private readonly cookieService = inject(CookieService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly platformId = inject<object>(PLATFORM_ID);

  // ── internal writable signals ────────────────────────────────────────────
  private readonly _guestId = signal<string | null>(null);
  private readonly _loginId = signal<string | null>(null);

  // ── public read-only signals ─────────────────────────────────────────────
  readonly guestId: Signal<string | null> = this._guestId.asReadonly();
  readonly loginId: Signal<string | null> = this._loginId.asReadonly();
  readonly hasGuest = computed(() => this._guestId() !== null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.parseAidCookie();
    }
  }

  /**
   * Parse the BFF-written `aid` cookie and populate signals.
   * Called automatically in the browser; safe to call again after cookie refresh.
   */
  parseAidCookie(): void {
    const raw = this.cookieService.get('aid');
    if (!raw) return;

    const parsed = cleanAndParseJSON(raw || '{}') as {
      guestId?: string;
      loginId?: string;
      userId?: string;
    };

    if (parsed?.guestId) this._guestId.set(parsed.guestId);
    if (parsed?.loginId) this._loginId.set(parsed.loginId);
  }

  /**
   * Link the current guest session to the authenticated user.
   * Delegates to FirestoreService which calls the backend function.
   */
  async linkGuestToUser(uid: string): Promise<void> {
    const guestId = this._guestId();
    if (!guestId || !uid) return;

    try {
      await this.firestoreService.linkGuestToUser(uid, guestId);
    } catch (err) {
      console.warn('[GuestTrackingService] Could not link guest to user:', err);
    }
  }

  /** Reset all guest signals (e.g. after account deletion or explicit clear). */
  clear(): void {
    this._guestId.set(null);
    this._loginId.set(null);
  }
}
