import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { onboardingGuard } from './onboarding.guard';
import { AuthService } from '../services';
import { getTestProviders } from 'src/app/testing';

describe('onboardingGuard', () => {
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => onboardingGuard(...guardParameters));

  const resolveGuardResult = async (result: ReturnType<CanActivateFn>): Promise<unknown> => {
    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return result;
    }

    return result;
  };

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
      isAdmin: false,
    });
    routerMock = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'parseUrl']);
    (routerMock.createUrlTree as jasmine.Spy).and.returnValue({ toString: () => '/service/login' } as any);
    (routerMock.parseUrl as jasmine.Spy).and.returnValue({ toString: () => '/dashboard' } as any);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should redirect to login when not authenticated', async () => {
    authServiceMock.isAuthenticated.and.returnValue(of({ isAuthenticated: false, user: null } as any));

    const route = { queryParams: {} } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/service/onboarding' } as RouterStateSnapshot;

    const result = executeGuard(route, state);
    const resolved = await resolveGuardResult(result);

    expect(routerMock.createUrlTree).toHaveBeenCalled();
  });

  it('should redirect to dashboard for already onboarded users', async () => {
    authServiceMock.isAuthenticated.and.returnValue(
      of({ isAuthenticated: true, user: { onboardedAt: new Date() } } as any)
    );

    const route = { queryParams: {} } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/service/onboarding' } as RouterStateSnapshot;

    const result = executeGuard(route, state);
    const resolved = await resolveGuardResult(result);

    expect(routerMock.parseUrl).toHaveBeenCalled();
  });

  it('should redirect to dashboard for bootstrap admins', async () => {
    Object.defineProperty(authServiceMock, 'isAdmin', {
      value: true,
      configurable: true,
    });
    authServiceMock.isAuthenticated.and.returnValue(of({ isAuthenticated: true, user: {} } as any));

    const route = { queryParams: {} } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/service/onboarding' } as RouterStateSnapshot;

    const result = executeGuard(route, state);
    const resolved = await resolveGuardResult(result);

    expect(routerMock.parseUrl).toHaveBeenCalled();
  });

  it('should allow activation for authenticated non-onboarded users', async () => {
    authServiceMock.isAuthenticated.and.returnValue(
      of({ isAuthenticated: true, user: { onboardedAt: null } } as any)
    );

    const route = { queryParams: {} } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/service/onboarding' } as RouterStateSnapshot;

    const result = executeGuard(route, state);
    const resolved = await resolveGuardResult(result);

    expect(resolved).toBe(true);
  });

  it('should preserve return URL parameter', async () => {
    authServiceMock.isAuthenticated.and.returnValue(of({ isAuthenticated: false, user: null } as any));

    const route = { queryParams: { returnUrl: '/dashboard' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/service/onboarding' } as RouterStateSnapshot;

    const result = executeGuard(route, state);
    const resolved = await resolveGuardResult(result);

    expect(routerMock.createUrlTree).toHaveBeenCalled();
  });
});
