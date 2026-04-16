import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { Router, ActivatedRouteSnapshot } from '@angular/router';

import { authzGuard } from './authz.guard';
import { AuthzService } from '../services';
import { getTestProviders } from 'src/app/testing';

describe('authzGuard', () => {
  let authzServiceMock: jasmine.SpyObj<AuthzService>;
  let routerMock: jasmine.SpyObj<Router>;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authzGuard(...guardParameters));

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
    authzServiceMock = jasmine.createSpyObj('AuthzService', ['can$'], {
      membershipsReady$: of(true),
    });
    routerMock = jasmine.createSpyObj('Router', ['navigate', 'parseUrl', 'createUrlTree']);
    (routerMock.parseUrl as jasmine.Spy).and.callFake((url: string) => ({ toString: () => url }));

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: AuthzService, useValue: authzServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow activation when user has permission', async () => {
    authzServiceMock.can$.and.returnValue(of(true));

    const route = {
      data: {
        authz: { resource: 'crawl', action: 'execute' },
      },
    } as unknown as ActivatedRouteSnapshot;

    const result = executeGuard(route, {} as any);
    const resolved = await resolveGuardResult(result);

    expect(resolved).toBe(true);
  });

  it('should deny activation when user lacks permission', async () => {
    authzServiceMock.can$.and.returnValue(of(false));

    const route = {
      data: {
        authz: { resource: 'crawl', action: 'delete' },
      },
    } as unknown as ActivatedRouteSnapshot;

    const result = executeGuard(route, {} as any);
    const resolved = await resolveGuardResult(result);

    expect(resolved).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should pass through when no authz data provided', async () => {
    const route = {
      data: {},
    } as unknown as ActivatedRouteSnapshot;

    const result = executeGuard(route, {} as any);
    const resolved = await resolveGuardResult(result);

    expect(resolved).toBe(true);
  });

  it('should wait for memberships to be ready', async () => {
    authzServiceMock.can$.and.returnValue(of(true));
    Object.defineProperty(authzServiceMock, 'membershipsReady$', {
      value: of(false).pipe(),
      configurable: true,
    });

    const route = {
      data: {
        authz: { resource: 'organization', action: 'manage' },
      },
    } as unknown as ActivatedRouteSnapshot;

    const result = executeGuard(route, {} as any);
    expect(isObservable(result)).toBe(true);
  });
});
