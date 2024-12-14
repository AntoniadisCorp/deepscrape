import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { getStorage, provideStorage } from '@angular/fire/storage';

import { initializeAppCheck, ReCaptchaEnterpriseProvider, provideAppCheck } from '@angular/fire/app-check';
import { getAuth, provideAuth } from '@angular/fire/auth';

export const appConfig: ApplicationConfig = {
  providers: [


    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideFirebaseApp(() =>
      initializeApp({
        "projectId": "libnet-d76db", "appId": "1:332716075857:web:e6a4f02e57bb59fe308170",
        "databaseURL": "https://libnet-d76db-default-rtdb.europe-west1.firebasedatabase.app", "storageBucket": "libnet-d76db.appspot.com",
        "apiKey": "AIzaSyDBtmW5km9bNJhhe-2bZdcz2SNKT8hoS7g", "authDomain": "libnet-d76db.firebaseapp.com", "messagingSenderId": "332716075857"
      })),

    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    providePerformance(() => getPerformance()),
    provideStorage(() => getStorage()),
    provideAppCheck(() => {
      // TODO get a reCAPTCHA Enterprise here https://console.cloud.google.com/security/recaptcha?project=_
      const provider = new ReCaptchaEnterpriseProvider("6LdpDvcpAAAAACHPpjMmhYp2ZoSO45-5VJUMI4-n");
      return initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
    }),


  ]
}
