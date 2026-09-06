import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthService } from '../services';
import { Router } from '@angular/router';

import { LoginGuard, verifyGuard } from './login.guard';
import { getTestProviders } from 'src/app/testing';

describe('loginGuard', () => {
  let authServiceMock: jasmine.SpyObj<Pick<AuthService, 'isAuthenticated'>>;
  let routerMock: jasmine.SpyObj<Pick<Router, 'navigate' | 'navigateByUrl' | 'createUrlTree' | 'parseUrl'>>;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => LoginGuard(...guardParameters));

  const executeVerifyGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => verifyGuard(...guardParameters));

  const resolveGuardResult = async (result: ReturnType<CanActivateFn>): Promise<unknown> => {
    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return result;
    }

    return result;
  }

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj<Pick<AuthService, 'isAuthenticated'>>('AuthService', ['isAuthenticated']);
    routerMock = jasmine.createSpyObj<Pick<Router, 'navigate' | 'navigateByUrl' | 'createUrlTree' | 'parseUrl'>>('Router', ['navigate', 'navigateByUrl', 'createUrlTree', 'parseUrl']);
    routerMock.createUrlTree.and.returnValue({} as any);
    routerMock.parseUrl.and.returnValue({} as any);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('allows unauthenticated users to access login page', async () => {
    authServiceMock.isAuthenticated.and.returnValue(of({ isAuthenticated: false, user: null }));

    const result = await resolveGuardResult(executeGuard({ queryParams: {} } as never, { url: '/service/login' } as never));

    expect(result).toBeTrue();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('redirects verified users to returnUrl from login page', async () => {
    authServiceMock.isAuthenticated.and.returnValue(
      of({
        isAuthenticated: true,
        user: {
          emailVerified: true,
          phoneVerified: true,
          currProviderData: { providerId: 'password' },
        } as never,
      }),
    );

    const result = await resolveGuardResult(executeGuard({ queryParams: { returnUrl: '/billing' } } as never, { url: '/service/login' } as never));

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/billing');
  });

  it('redirects unverified authenticated users to verification from login page', async () => {
    authServiceMock.isAuthenticated.and.returnValue(
      of({
        isAuthenticated: true,
        user: {
          emailVerified: false,
          phoneVerified: false,
          currProviderData: { providerId: 'password' },
        } as never,
      }),
    );

    const result = await resolveGuardResult(executeGuard({ queryParams: {} } as never, { url: '/service/login' } as never));

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/service/verification'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });

  it('verifyGuard redirects unauthenticated users to login', async () => {
    authServiceMock.isAuthenticated.and.returnValue(of({ isAuthenticated: false, user: null }));

    const result = await resolveGuardResult(executeVerifyGuard({ queryParams: {} } as never, { url: '/service/verification' } as never));

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/service/login']);
  });

  it('verifyGuard allows unverified users to stay on verification page', async () => {
    authServiceMock.isAuthenticated.and.returnValue(
      of({
        isAuthenticated: true,
        user: {
          emailVerified: false,
          phoneVerified: false,
        } as never,
      }),
    );

    const result = await resolveGuardResult(executeVerifyGuard({ queryParams: {} } as never, { url: '/service/verification' } as never));

    expect(result).toBeTrue();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });
});
