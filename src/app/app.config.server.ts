import { provideServerRendering, withRoutes } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
/* import { initializeAuth, inMemoryPersistence, provideAuth } from '@angular/fire/auth';
import { initializeApp } from '@angular/fire/app';
import { environment } from 'src/environments/environment';
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    /* provideAuth(() =>
      initializeAuth(initializeApp(environment.firebaseConfig), {
        persistence: inMemoryPersistence,
        popupRedirectResolver: undefined,
      })
    ), */
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
