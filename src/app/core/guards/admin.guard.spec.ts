import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { Router } from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthzService } from '../services';
import { getTestProviders } from 'src/app/testing';

describe('adminGuard', () => {
  let authzServiceMock: jasmine.SpyObj<AuthzService>;
  let routerMock: jasmine.SpyObj<Router>;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

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
    authzServiceMock = jasmine.createSpyObj('AuthzService', ['hasPlatformAdminAccess$']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: AuthzService, useValue: authzServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow activation for platform admins', async () => {
    authzServiceMock.hasPlatformAdminAccess$.and.returnValue(of(true));

    const result = executeGuard({} as any, {} as any);
    const resolved = await resolveGuardResult(result);

    expect(resolved).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should deny activation for non-admins', async () => {
    authzServiceMock.hasPlatformAdminAccess$.and.returnValue(of(false));

    const result = executeGuard({} as any, {} as any);
    const resolved = await resolveGuardResult(result);

    expect(resolved).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
