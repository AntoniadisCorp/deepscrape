import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

// Available locale files under src/assets/i18n — keep in sync with them.
export const SUPPORTED_LANGS = ['en', 'el', 'es', 'fr', 'de'];

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private translate = inject(TranslateService);

  readonly currentLang = signal<string>(this.initialLang());
  readonly currentLang$ = toObservable(this.currentLang);

  private initialLang(): string {
    const browser = (this.translate.getBrowserLang() || 'en').toLowerCase().split('-')[0];
    return SUPPORTED_LANGS.includes(browser) ? browser : 'en';
  }

  constructor() {
    this.currentLang$.subscribe((lang) => this.translate.use(lang));
  }

  use(lang: string): void {
    this.currentLang.set(lang);
  }

  instant(key: string | Array<string>, interpolateParams?: object): string {
    return this.translate.instant(key, interpolateParams);
  }

  get(key: string | Array<string>, interpolateParams?: object): Observable<string | any> {
    return this.translate.get(key, interpolateParams);
  }
}
