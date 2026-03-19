import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthService } from '../services';
import { Router } from '@angular/router';

import { authGuard } from './auth.guard';
import { getTestProviders } from 'src/app/testing';

describe('authGuard', () => {
  let authServiceMock: jasmine.SpyObj<Pick<AuthService, 'isAuthenticated'>>;
  let routerMock: jasmine.SpyObj<Pick<Router, 'navigate'>>;

  const executeGuard: CanActivateFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => authGuard(...guardParameters));

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
    routerMock = jasmine.createSpyObj<Pick<Router, 'navigate'>>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('redirects unauthenticated users to login with returnUrl', async () => {
    authServiceMock.isAuthenticated.and.returnValue(of({ isAuthenticated: false, user: null }));

    const result = await resolveGuardResult(executeGuard({} as never, { url: '/dashboard' } as never));

    expect(result).toBeFalse();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/service/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });

  it('redirects password users with unverified email to verification', async () => {
    authServiceMock.isAuthenticated.and.returnValue(
      of({
        isAuthenticated: true,
        user: {
          emailVerified: false,
          phoneVerified: false,
          phoneNumber: null,
          currProviderData: { providerId: 'password' },
        } as never,
      }),
    );

    const result = await resolveGuardResult(executeGuard({} as never, { url: '/settings' } as never));

    expect(result).toBeFalse();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/service/verification'], {
      queryParams: { returnUrl: '/settings' },
    });
  });

  it('allows authenticated and verified users', async () => {
    authServiceMock.isAuthenticated.and.returnValue(
      of({
        isAuthenticated: true,
        user: {
          emailVerified: true,
          phoneVerified: true,
          phoneNumber: '+10000000000',
          currProviderData: { providerId: 'password' },
        } as never,
      }),
    );

    const result = await resolveGuardResult(executeGuard({} as never, { url: '/dashboard' } as never));

    expect(result).toBeTrue();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
