import { inject, Injectable } from '@angular/core';
import { BrowserToken } from './browser.service';
import { EXTENSION_ID } from '../variables';

/* https://github.com/jprivet-dev/chrome-extension-angular-starter-kit */
@Injectable({
  providedIn: 'root',
})
export class ExtensionService {
  // private window = inject(WindowToken)
  private browser = inject(BrowserToken);
  // Function to fetch cookies from the extension
  fetchCookies(domain: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.browser) {
        console.log('cookies', this.browser)
        const id = EXTENSION_ID;

        this.browser.runtime.sendMessage(id, { action: 'getCookies', domain: domain }, function (response: any) {
          console.log(response)
          if (response && response.cookies) {
            resolve(response.cookies);
          } else {
            reject('No cookies found or error occurred');
          }
        }
        )
      } else {
        console.error("Chrome runtime API not available.");
        reject('Chrome runtime API not available.');
      }
    }) as Promise<any>
  }
}
