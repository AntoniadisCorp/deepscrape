import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsentModalComponent } from './consent-modal.component';
import { getTestProviders } from 'src/app/testing';

describe('ConsentModalComponent', () => {
  let component: ConsentModalComponent;
  let fixture: ComponentFixture<ConsentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsentModalComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(ConsentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('ngOnInit sets isConsent to false when localStorage has no consent', () => {
    expect(component.isConsent).toBeFalse();
  });

  it('acceptConsent sets isConsent to true and emits true', () => {
    const spy = jasmine.createSpy('consentAccepted');
    component.consentAccepted.subscribe(spy);
    component.acceptConsent();
    expect(component.isConsent).toBeTrue();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('declineConsent emits consentAccepted(false) and onExtensionDecline(false)', () => {
    const consentSpy = jasmine.createSpy('consentAccepted');
    const declineSpy = jasmine.createSpy('onExtensionDecline');
    component.consentAccepted.subscribe(consentSpy);
    component.onExtensionDecline.subscribe(declineSpy);
    component.declineConsent();
    expect(consentSpy).toHaveBeenCalledWith(false);
    expect(declineSpy).toHaveBeenCalledWith(false);
  });
});
