import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

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
});
