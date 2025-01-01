import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { LocalStorage, WindowToken } from '../../services';



@Component({
  selector: 'app-consent-modal',
  standalone: true,
  imports: [NgIf],
  templateUrl: './consent-modal.component.html',
  styleUrl: './consent-modal.component.scss'
})
export class ConsentModalComponent {
  isConsent: boolean = false;
  private window = inject(WindowToken);
  private localStorage = inject(LocalStorage);
  @Input() isExtensionInstalled: boolean = true;  // Track if extension is already installed

  @Output() consentAccepted = new EventEmitter<boolean>();

  constructor(private cdr: ChangeDetectorRef) { }
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.isConsent = this.localStorage.getItem('privacyConsent') === 'true';
  }

  acceptConsent() {
    this.isConsent = true;
    this.consentAccepted.emit(true);
  }

  declineConsent() {
    this.isConsent = true;
    this.consentAccepted.emit(false);
  }
  // Redirect to browser extension store for download
  downloadExtension() {

    // Replace with the actual URL of your extension
    const extensionUrl = 'https://chrome.google.com/webstore/detail/your-extension-id';

    this.window.open(extensionUrl, '_blank');
  }


}
