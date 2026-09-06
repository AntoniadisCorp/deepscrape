import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserCookiesComponent } from './cookies.component';
import { getTestProviders } from 'src/app/testing';

describe('CookiesComponent', () => {
  let component: BrowserCookiesComponent;
  let fixture: ComponentFixture<BrowserCookiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserCookiesComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(BrowserCookiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('onConsentAccepted(true) sets isConsentGiven to true', () => {
    component.onConsentAccepted(true);
    expect(component.isConsentGiven).toBeTrue();
  });

  it('onConsentAccepted(false) does not set isConsentGiven to true', () => {
    component.onConsentAccepted(false);
    expect(component.isConsentGiven).toBeFalse();
  });

  it('onExtensionDecline emits cookiesDisabled with the provided value', () => {
    const spy = jasmine.createSpy('cookiesDisabled');
    component.cookiesDisabled.subscribe(spy);
    component.onExtensionDecline(false);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('onExtensionInstalled updates isExtensionInstalled', () => {
    component.onExtensionInstalled(false);
    expect(component.isExtensionInstalled).toBeFalse();
    component.onExtensionInstalled(true);
    expect(component.isExtensionInstalled).toBeTrue();
  });
});
