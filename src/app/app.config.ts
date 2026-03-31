import { ApplicationConfig, isDevMode, importProvidersFrom, provideZonelessChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { DomSanitizer, provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { FirebaseApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideAnalytics, getAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';

import { initializeAppCheck, ReCaptchaEnterpriseProvider, provideAppCheck, ReCaptchaV3Provider } from '@angular/fire/app-check';
import { getAuth, inMemoryPersistence, initializeAuth, provideAuth } from '@angular/fire/auth';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { browserProvider, BrowserToken, PLUTO_ID, STORAGE_PROVIDERS, windowProvider, WindowToken } from './core/services';
import { provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi, withXsrfConfiguration } from '@angular/common/http';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { environment } from 'src/environments/environment';
import { provideMarkdown } from 'ngx-markdown';
import { provideNgxStripe } from 'ngx-stripe';
import { ReactiveFormsModule } from '@angular/forms';
import { NAVIGATOR_PROVIDER } from './core/providers';
import { LogLevel, setLogLevel } from '@angular/fire';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { myIcons } from './shared'
import { provideI18n } from './core/i18n'; // Import provideI18n
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { csrfRefreshInterceptor, orgContextInterceptor, paymentRequiredInterceptor } from './core/interceptors';
import { PLATFORM_ID } from '@angular/core';

setLogLevel(
  environment.production ? LogLevel.SILENT : LogLevel.VERBOSE
)

// Custom image loader that handles both dev and prod
const customImageLoader = (config: ImageLoaderConfig) => {
  const baseUri = environment.assetsUri.endsWith('/') ? environment.assetsUri : environment.assetsUri + '/';
  return baseUri + config.src.replace(/^\//, '');
}

const hasSsrSerializedState =
  typeof document !== 'undefined' &&
  !!document.querySelector('script#ng-state');

const hydrationProviders = hasSsrSerializedState
  ? [
      provideClientHydration(
        withHttpTransferCacheOptions({
          includePostRequests: true,
        }),
      ),
    ]
  : [];

export const appConfig: ApplicationConfig = {
  providers: [
    NAVIGATOR_PROVIDER,
    STORAGE_PROVIDERS,
    { provide: WindowToken, useFactory: windowProvider },
    { provide: BrowserToken, useFactory: browserProvider },
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(myIcons) }, // Register the LucideIconProvider
    importProvidersFrom(LoadingBarHttpClientModule),
    provideMarkdown({
      // loader: HttpClient,
    }),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([csrfRefreshInterceptor, orgContextInterceptor, paymentRequiredInterceptor]),
      withXsrfConfiguration({ cookieName: '_csrf', headerName: 'csrf-token' }),
      withFetch(),      
      /* withInterceptors([
        new TokenInterceptor().intercept,
        // new CsrfInterceptor().intercept
      ]), */
    ),    // Custom image loader for dev and prod
    {
      provide: IMAGE_LOADER,
      useValue: customImageLoader
    },

    // provideZoneChangeDetection({ eventCoalescing: true }),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnalytics(() => getAnalytics(initializeApp(environment.firebaseConfig))),
    ScreenTrackingService, // track page views automatically
    UserTrackingService, // track unique users automatically
    ...hydrationProviders,
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() =>
    {
      const firestore = getFirestore();
      if (environment.emulators && isPlatformBrowser(inject(PLATFORM_ID))) {
        console.log('🔥 Connecting Firestore to Emulator');
        connectFirestoreEmulator(firestore, 'localhost', 5001);
      }
      return firestore
    }
    ),
    provideFunctions(() => {

      const functions = getFunctions()
      if (environment.emulators && isPlatformBrowser(inject(PLATFORM_ID))) {
        console.log('🔥 Connecting Functions to Emulator');
        connectFunctionsEmulator(functions, 'localhost', 8081)
      }
      return functions;
    }),
    provideMessaging(() => getMessaging()),
    providePerformance(() => getPerformance(initializeApp(environment.firebaseConfig))),
    provideStorage(() => getStorage()),
    {
      provide: 'APP_CHECK',
      useFactory: () => {
        if (isPlatformBrowser(inject(PLATFORM_ID))) {
          try {
            return initializeAppCheck(undefined, {
              provider: new ReCaptchaV3Provider(environment.RECAPTCHA_KEY), // ReCaptchaEnterpriseProvider
              isTokenAutoRefreshEnabled: true
            })
          }
          catch (error) {
            console.error('AppCheck initialization failed:', error);
            return null;
          }
        }
        return null;
      }
    },
    /* provideAppCheck(() => {
      // TODO get a reCAPTCHA Enterprise here https://console.cloud.google.com/security/recaptcha?project=_
      const provider = new ReCaptchaEnterpriseProvider("");
      return initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
    }),
 */ provideAnimationsAsync(),
    importProvidersFrom(ReactiveFormsModule),
    provideNgxStripe(),
    provideCharts(withDefaultRegisterables()), // Add ng2-charts providers
    {
      provide: PLUTO_ID,
      useValue: '449f8516-791a-49ab-a09d-50f79a0678b6',
    },
    provideI18n(), // Add the i18n providers here
  ]
}
