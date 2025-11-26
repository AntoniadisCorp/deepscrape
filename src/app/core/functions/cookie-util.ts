// Utility for secure cookie operations
import { Injectable, Inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({ providedIn: 'root' })
export class CookieUtil {
  private static cookieService: CookieService;

  static injectService(service: CookieService) {
    CookieUtil.cookieService = service;
  }

  static set(name: string, value: string, days: number, path: string = '/', domain: string = '', secure: boolean = true, sameSite: 'Lax' | 'Strict' | 'None' = 'Lax') {
    if (!CookieUtil.cookieService) throw new Error('CookieService not injected');
    CookieUtil.cookieService.set(name, value, days, path, domain, secure, sameSite);
  }
  static get(name: string): string {
    if (!CookieUtil.cookieService) throw new Error('CookieService not injected');
    return CookieUtil.cookieService.get(name);
  }
  static delete(name: string) {
    if (!CookieUtil.cookieService) throw new Error('CookieService not injected');
    CookieUtil.cookieService.delete(name);
  }
}
