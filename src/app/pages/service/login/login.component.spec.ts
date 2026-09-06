import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PhoneMultiFactorGenerator, TotpMultiFactorGenerator } from '@angular/fire/auth';

import { LoginComponent } from './login.component';
import { getTestProviders } from 'src/app/testing';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: getTestProviders(),
    })
    .overrideComponent(LoginComponent, {
      set: {
        template: '<form [formGroup]="loginForm"></form>',
        imports: [ReactiveFormsModule],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('should initialize login form with identifier and password controls', () => {
    fixture.detectChanges();
    const form = (component as unknown as { loginForm: FormGroup }).loginForm;
    expect(form.contains('identifier')).toBeTrue();
    expect(form.contains('password')).toBeTrue();
  });

  it('should keep form invalid when identifier is missing', () => {
    fixture.detectChanges();
    const form = (component as unknown as { loginForm: FormGroup }).loginForm;
    form.patchValue({ identifier: '', password: 'valid-password' });
    expect(form.invalid).toBeTrue();
  });

  it('should enforce identifier format validation', () => {
    fixture.detectChanges();
    const form = (component as unknown as { loginForm: FormGroup }).loginForm;

    form.patchValue({ identifier: 'bad!', password: 'valid-password' });
    expect(form.get('identifier')?.invalid).toBeTrue();

    form.patchValue({ identifier: 'user@example.com', password: 'valid-password' });
    expect(form.get('identifier')?.valid).toBeTrue();
  });

  it('should switch MFA factor to totp when available', async () => {
    fixture.detectChanges();

    const resolver = {
      hints: [
        { factorId: TotpMultiFactorGenerator.FACTOR_ID, uid: 'totp-1', displayName: 'Auth app' },
        { factorId: PhoneMultiFactorGenerator.FACTOR_ID, uid: 'phone-1', displayName: 'Phone', phoneNumber: '+12345678901' },
      ],
    } as any;

    (component as any).mfaResolver = resolver;
    (component as any).showMfaChallenge = true;
    (component as any).mfaFactorType = 'phone';
    (component as any).mfaCode = '123456';

    const sendSmsSpy = spyOn<any>(component, 'sendMfaSmsCode').and.resolveTo(undefined);

    await component.switchMfaFactor('totp');

    expect((component as any).mfaFactorType).toBe('totp');
    expect((component as any).mfaEnrollmentUid).toBe('totp-1');
    expect((component as any).mfaCode).toBe('');
    expect(sendSmsSpy).not.toHaveBeenCalled();
  });

  it('should switch MFA factor to phone and send sms challenge', async () => {
    fixture.detectChanges();

    const resolver = {
      hints: [
        { factorId: TotpMultiFactorGenerator.FACTOR_ID, uid: 'totp-1', displayName: 'Auth app' },
        { factorId: PhoneMultiFactorGenerator.FACTOR_ID, uid: 'phone-1', displayName: 'Phone', phoneNumber: '+12345678901' },
      ],
    } as any;

    (component as any).mfaResolver = resolver;
    (component as any).showMfaChallenge = true;
    (component as any).mfaFactorType = 'totp';

    const sendSmsSpy = spyOn<any>(component, 'sendMfaSmsCode').and.resolveTo(undefined);

    await component.switchMfaFactor('phone');

    expect((component as any).mfaFactorType).toBe('phone');
    expect((component as any).mfaPhoneDisplay).toBe('+12345678901');
    expect(sendSmsSpy).toHaveBeenCalledTimes(1);
  });
});
