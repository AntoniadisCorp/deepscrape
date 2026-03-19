import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import * as fireAuth from '@angular/fire/auth';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from 'src/app/core/services';
import { of } from 'rxjs';

import { ActionHandlerComponent } from './action-handler.component';
import { getTestProviders } from 'src/app/testing';

describe('ActionHandlerComponent', () => {
  let component: ActionHandlerComponent;
  let fixture: ComponentFixture<ActionHandlerComponent>;
  let mockActivatedRoute: any;
  let mockRouter: any;
  let mockAuth: any;
  let mockTranslate: any;
  let mockTheme: any;

  beforeEach(async () => {
    mockActivatedRoute = { snapshot: { queryParamMap: { get: () => 'test-oob-code' } } };
    mockRouter = { navigate: jasmine.createSpy('navigate') };
    mockAuth = {};
    mockTranslate = { instant: (key: string) => key };
    mockTheme = { isDarkMode$: of(false) };

    await TestBed.configureTestingModule({
      imports: [ActionHandlerComponent],
      providers: [
        ...getTestProviders(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: Auth, useValue: mockAuth },
        { provide: TranslateService, useValue: mockTranslate },
        { provide: ThemeService, useValue: mockTheme },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActionHandlerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set oobCode from route on init', async () => {
    await component.ngOnInit();
    expect(component.oobCode).toBe('test-oob-code');
  });

  it('should show error if no oobCode in route', async () => {
    mockActivatedRoute.snapshot.queryParamMap.get = () => null;
    await component.ngOnInit();
    expect(component.errorMessage).toBe('RESET_PASSWORD.NO_CODE_FOUND');
  });

  it('should call confirmPasswordReset and show success on resetPassword', async () => {
    component.oobCode = 'test-oob-code';
    component.newPassword = 'StrongP@ss1!';
    component.confirmPassword = 'StrongP@ss1!';
    spyOn(fireAuth, 'confirmPasswordReset').and.returnValue(Promise.resolve());
    await component.resetPassword();
    expect(component.successMessage).toBe('RESET_PASSWORD.SUCCESS');
  });

  it('should show error on resetPassword failure', async () => {
    component.oobCode = 'test-oob-code';
    component.newPassword = 'StrongP@ss1!';
    component.confirmPassword = 'StrongP@ss1!';
    spyOn(fireAuth, 'confirmPasswordReset').and.returnValue(Promise.reject('error'));
    await component.resetPassword();
    expect(component.errorMessage).toBe('RESET_PASSWORD.FAILED');
  });
});
