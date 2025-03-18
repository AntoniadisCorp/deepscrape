import { ApplicationConfig, provideZoneChangeDetection, isDevMode, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { DomSanitizer, provideClientHydration } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { getStorage, provideStorage } from '@angular/fire/storage';

import { initializeAppCheck, ReCaptchaEnterpriseProvider, provideAppCheck, ReCaptchaV3Provider } from '@angular/fire/app-check';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { browserProvider, BrowserToken, PLUTO_ID, STORAGE_PROVIDERS, windowProvider, WindowToken } from './core/services';
import { HttpClient, provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideImgixLoader } from '@angular/common';
import { environment } from '../environments/environment';
import { provideMarkdown } from 'ngx-markdown';

/* import 'prismjs';
import 'prismjs/components/prism-typescript.min.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/plugins/line-highlight/prism-line-highlight.js'; */
import { provideNgxStripe } from 'ngx-stripe';
import { ReactiveFormsModule } from '@angular/forms';
import { NAVIGATOR_PROVIDER } from './core/providers';

export const appConfig: ApplicationConfig = {
  providers: [
    NAVIGATOR_PROVIDER,
    STORAGE_PROVIDERS,
    { provide: WindowToken, useFactory: windowProvider },
    { provide: BrowserToken, useFactory: browserProvider },

    /* {
      provide: MatIconRegistry,
      useFactory: (registry: MatIconRegistry, sanitizer: DomSanitizer) => {
        registry.registerFontClassAlias('custom-font', 'custom-font');
        return registry;
      },
      deps: [MatIconRegistry, DomSanitizer],
    }, */

    importProvidersFrom(LoadingBarHttpClientModule),
    provideMarkdown({
      loader: HttpClient,
    }),
    provideHttpClient(
      withInterceptorsFromDi(),
      // withXsrfConfiguration({ cookieName: 'csrf_', headerName: 'X-Csrf-Token' }),
      withFetch(),

      /* withInterceptors([
        new TokenInterceptor().intercept,
        // new CsrfInterceptor().intercept
      ]), */
    ),

    // Call the function and add the result to the `providers` array:
    provideImgixLoader(environment.assetsUri),

    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),

    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    providePerformance(() => getPerformance()),
    provideStorage(() => getStorage()),
    {
      provide: 'APP_CHECK',
      useFactory: () => {
        if (typeof window !== 'undefined') {
          try {
            return initializeAppCheck(undefined, {
              provider: new ReCaptchaV3Provider(environment.recpatcha),
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
 */
    provideAnimationsAsync(),
    importProvidersFrom(ReactiveFormsModule),
    provideNgxStripe(),
    {
      provide: PLUTO_ID,
      useValue: '449f8516-791a-49ab-a09d-50f79a0678b6',
    },
  ]
}
