import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateService, TranslateModule } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from './translate-loader';
import { I18nService } from './i18n.service';
import { take } from 'rxjs';

export function createTranslateLoader(http: HttpClient) {
  return new MultiTranslateHttpLoader(http, [
    '/assets/i18n', // global translations
  ]);
}

export function appInitializerFactory() {
  const i18nService = inject(I18nService);
  return i18nService.currentLang$.pipe(take(1)).toPromise();
}

export const provideI18n = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    TranslateModule.forRoot({
      fallbackLang: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }).providers || [],
    provideAppInitializer(appInitializerFactory),
  ]);
