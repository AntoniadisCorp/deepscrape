import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private translate = inject(TranslateService);

  readonly currentLang = signal<string>(this.translate.getBrowserLang() || 'en');
  readonly currentLang$ = toObservable(this.currentLang);

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
