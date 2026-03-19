/**
 * Central testing utilities for deepscrape Angular specs.
 *
 * Usage in spec files:
 *   import { getTestProviders } from 'src/app/testing';
 *   TestBed.configureTestingModule({ providers: getTestProviders() });
 *   // or for components:
 *   TestBed.configureTestingModule({ imports: [MyComponent], providers: getTestProviders() });
 */
import { EnvironmentProviders, NgZone, PLATFORM_ID, Provider } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNgxStripe } from 'ngx-stripe';

// @angular/fire modular tokens
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import { Analytics } from '@angular/fire/analytics';
import { Functions } from '@angular/fire/functions';
import { Messaging } from '@angular/fire/messaging';
import { Performance } from '@angular/fire/performance';

// Custom app tokens
import { WindowToken } from '../core/services/window.service';
import { BrowserToken } from '../core/services/browser.service';
import { LocalStorage, SessionStorage, NoopStorage } from '../core/services/storage.service';
import { PLUTO_ID } from '../core/services/pluto.service';
import { NAVIGATOR } from '../core/providers';
import { CONTROL_NAME } from '../core/services/pack.service';

// Third-party services
import { CookieService } from 'ngx-cookie-service';

// App services (mocked)
import { HeartbeatService } from '../core/services/heartbeat.service';
import { AnalyticsService } from '../core/services/analytics.service';
import { AuthService } from '../core/services/auth.service';
import { FirestoreService } from '../core/services/firestore.service';
import { CartService } from '../core/services/cart.service';
import { ApiKeyService } from '../core/services/apikey.service';
import { AppUserLayoutComponent } from '../layout/full/app-user-layout/app-user-layout.component';
import { of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

// Re-export for convenience
export { HttpTestingController } from '@angular/common/http/testing';

// ---------------------------------------------------------------------------
// Minimal stub objects
// ---------------------------------------------------------------------------

/** Minimal Firebase Auth stub */
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (_cb: unknown) => () => {},
  signInWithEmailAndPassword: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  app: { options: {} },
};

/** Minimal Firebase Firestore stub */
const mockFirestore = {
  collection: () => ({}),
  doc: () => ({}),
  app: { options: {} },
};

/** Minimal Firebase Storage stub */
const mockStorage = {
  ref: () => ({}),
  app: { options: {} },
  maxUploadRetryTime: 0,
  maxOperationRetryTime: 0,
};

/** Minimal CookieService stub */
const mockCookieService = {
  get: () => '',
  getAll: () => ({}),
  set: () => {},
  delete: () => {},
  deleteAll: () => {},
  check: () => false,
};

/** Minimal HeartbeatService stub */
const mockHeartbeatService = {
  start: () => {},
  stop: () => {},
  beat: () => {},
};

/** Minimal AnalyticsService stub */
const mockAnalyticsService = {
  trackEvent: () => {},
  logEvent: () => {},
  setUser: () => {},
  track: () => {},
};

const mockFirestoreService = {
  getInstanceDB: () => ({}),
  getUserData: () => Promise.resolve(null),
  setUserData: () => Promise.resolve(true),
  updateLoginMetrics: () => Promise.resolve(true),
  checkDomainValidity: () => Promise.resolve({ valid: true }),
  loadPreviousPacks: () => Promise.resolve([]),
  callFunction: () => Promise.resolve({ error: false, machines: [], inTotal: 0, totalPages: 1 }),
};

const mockAuthService = {
  token: undefined,
  isAdmin: false,
  userSubject: { value: null, next: () => {} },
  user$: of(null),
  isAuthenticated: () => of({ isAuthenticated: false, user: null }),
  signOut: () => Promise.resolve(),
};

const mockTranslateService = {
  getBrowserLang: () => 'en',
  use: (_lang: string) => of('en'),
  instant: (key: string) => key,
  get: (key: string) => of(key),
  stream: (key: string) => of(key),
};

const mockCartService = {
  cartPackItem$: of(null),
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
};

const mockApiKeyService = {
  setMenuInVisible: () => {},
};

const mockAppUserLayout = {
  onCloseAsideBar: () => {},
};

// ---------------------------------------------------------------------------
// Main provider factory
// ---------------------------------------------------------------------------

/**
 * Returns a flat array of providers/environment-providers suitable for
 * `TestBed.configureTestingModule({ providers: getTestProviders() })`.
 *
 * Provides mocks for every Firebase service, custom injection tokens,
 * HttpClient (with testing controller), Router, and common app services
 * so that components and services can be instantiated without real Firebase.
 */
export function getTestProviders(): (Provider | EnvironmentProviders)[] {
  const noopStorage = new NoopStorage();

  return [
    // --- Angular internals ---
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideRouter([]),
    provideHttpClient(withFetch()),
    provideHttpClientTesting(),
    provideNgxStripe(),

    // --- Platform---
    { provide: PLATFORM_ID, useValue: 'browser' },
    { provide: NgZone, useValue: new NgZone({ enableLongStackTrace: false }) },

    // --- Firebase mocks ---
    { provide: Auth, useValue: mockAuth },
    { provide: Firestore, useValue: mockFirestore },
    { provide: Storage, useValue: mockStorage },
    { provide: Analytics, useValue: null },
    { provide: Functions, useValue: null },
    { provide: Messaging, useValue: null },
    { provide: Performance, useValue: null },

    // --- Custom tokens ---
    { provide: WindowToken, useValue: window },
    { provide: NAVIGATOR, useValue: window.navigator },
    { provide: BrowserToken, useValue: {} },
    { provide: LocalStorage, useValue: noopStorage },
    { provide: SessionStorage, useValue: noopStorage },
    { provide: PLUTO_ID, useValue: 'test-pluto-id' },
    { provide: CONTROL_NAME, useValue: 'test-control' },

    // --- Third-party service mocks ---
    { provide: CookieService, useValue: mockCookieService },

    // --- App service mocks ---
    { provide: HeartbeatService, useValue: mockHeartbeatService },
    { provide: AnalyticsService, useValue: mockAnalyticsService },
    { provide: FirestoreService, useValue: mockFirestoreService },
    { provide: AuthService, useValue: mockAuthService },
    { provide: TranslateService, useValue: mockTranslateService },
    { provide: CartService, useValue: mockCartService },
    { provide: ApiKeyService, useValue: mockApiKeyService },
    { provide: AppUserLayoutComponent, useValue: mockAppUserLayout },
  ];
}
