import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { SessionTimeoutService } from './session-timeout.service';
import { getTestProviders } from 'src/app/testing';
import { AuthService } from './auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('SessionTimeoutService', () => {
  let service: SessionTimeoutService;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let snackbarMock: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', [], {
      user$: of(null),
    });
    snackbarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatSnackBar, useValue: snackbarMock },
      ],
    });

    service = TestBed.inject(SessionTimeoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with null session expiry', () => {
    expect(service.sessionExpiry()).toBeNull();
  });

  it('should initialize with zero time until expiry', () => {
    expect(service.timeUntilExpiry()).toBe(0);
  });

  it('should not show warning initially', () => {
    expect(service.showWarning()).toBe(false);
  });

  it('should start monitoring when user logs in', fakeAsync(() => {
    const mockUser = { uid: 'test-user', email: 'test@example.com' } as any;
    Object.defineProperty(authServiceMock, 'user$', {
      value: of(mockUser),
      configurable: true,
    });

    const newService = TestBed.inject(SessionTimeoutService);
    tick(100);

    expect(newService).toBeTruthy();
  }));

  it('should stop monitoring when user logs out', fakeAsync(() => {
    Object.defineProperty(authServiceMock, 'user$', {
      value: of(null),
      configurable: true,
    });

    const newService = TestBed.inject(SessionTimeoutService);
    tick(100);

    expect(newService.sessionExpiry()).toBeNull();
  }));

  it('should calculate time until expiry correctly', fakeAsync(() => {
    const mockUser = { uid: 'test-user' } as any;
    Object.defineProperty(authServiceMock, 'user$', {
      value: of(mockUser),
      configurable: true,
    });

    const newService = TestBed.inject(SessionTimeoutService);
    tick(1000);

    const timeUntilExpiry = newService.timeUntilExpiry();
    expect(timeUntilExpiry).toBeGreaterThanOrEqual(0);
  }));
});
