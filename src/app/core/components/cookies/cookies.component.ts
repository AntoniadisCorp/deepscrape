import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ConsentModalComponent } from '../consent-modal/consent-modal.component';
import { NgFor, NgIf } from '@angular/common';
import { BrowserToken, ExtensionService, LocalStorage } from '../../services';
import { from } from 'rxjs/internal/observable/from';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { extractDomain } from '../../functions';
import { of } from 'rxjs/internal/observable/of';
import { EXTENSION_ID } from '../../variables';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [ConsentModalComponent, NgIf, ReactiveFormsModule],
  templateUrl: './cookies.component.html',
  styleUrl: './cookies.component.scss'
})
export class BrowserCookiesComponent {

  inputUrl: FormControl<string> = new FormControl('', { nonNullable: true });
  error: string = '';
  cookies: any[] = [];
  isConsentGiven: boolean = false;
  closeModal: boolean = true;

  isExtensionInstalled: boolean = true;

  @Input() forwardCookiesBtnEnabled: boolean = true

  @Output() cookiesDisabled = new EventEmitter<boolean>()

  private browser = inject(BrowserToken)
  private localStorage: Storage

  private extensionService = inject(ExtensionService)
  constructor() {
    this.localStorage = inject(LocalStorage)
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.isConsentGiven = localStorage.getItem('privacyConsent') === 'true';
    this.checkExtension()
  }

  ngOnInit(): void {
    // this.forwardCookiesBtnEnabled = new FormControl(false, { nonNullable: true });
  }

  onConsentAccepted(consent: boolean) {
    this.closeModal = true;
    if (consent) {
      this.isConsentGiven = true;
      this.closeModal = this.isExtensionInstalled
      this.localStorage.setItem('privacyConsent', 'true')
      this.localStorage.setItem('forwardCookies', 'true')
    }

    if (!consent)
      this.localStorage.setItem('privacyConsent', 'false')

  }

  onExtensionDecline(extDownloadDecline: boolean) {
    this.cookiesDisabled.emit(extDownloadDecline)
    this.localStorage.setItem("forwardCookies", String(extDownloadDecline))
  }

  onExtensionInstalled(installed: boolean) {
    this.isExtensionInstalled = installed;
    this.closeModal = this.isExtensionInstalled && this.isConsentGiven
  }

  // Function to fetch cookies if consent is given
  fetchCookiesFromExtension(url: string | null) {
    if (!url) {
      alert('Please enter a domain.');
      return of(null);
    }
    if (!this.isConsentGiven) {
      alert('You need to accept the privacy policy to proceed.');
      return of(null);
    }

    const domain = extractDomain(url) || ''

    console.log("Domain", domain);

    return from(this.extensionService.fetchCookies(domain))/* .subscribe({
      next: (cookies) => {
        this.cookies = cookies;
      },
      error: (err) => {
        this.error = err;
      }
    }) */
  }

  checkExtension() {
    /**  *https://stackoverflow.com/questions/47075437/cannot-find-namespace-name-chrome */
    // Try to communicate with the extension
    let isExtensionInstalled = false
    try {
      // console.log("Checking if extension is installed", this.browser);
      if (this.browser) {
        const id = EXTENSION_ID; // Replace with your extension ID
        this.browser.runtime.sendMessage(id, { ping: true }, function (response: any) {
          if (response && response.status === "ok") {
            console.log("Extension installed");
            isExtensionInstalled = true
          } else {
            console.log("Extension not installed");
            isExtensionInstalled = false
          }
        })
      }
    } catch (error) {
      console.log("Extension not installed");
    }

    setTimeout(() => {
      this.isExtensionInstalled = isExtensionInstalled
      this.onExtensionInstalled(isExtensionInstalled)
      // this.cdr.detectChanges();  // Trigger change detection to update UI
    }, 1000);
  }

}
