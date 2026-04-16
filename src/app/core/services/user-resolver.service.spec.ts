import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { UserResolver } from './user-resolver.service';
import { getTestProviders } from 'src/app/testing';
import { AuthService, OrganizationService } from 'src/app/core/services';

describe('UserResolver', () => {
  let service: UserResolver;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let organizationServiceMock: jasmine.SpyObj<OrganizationService>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', [], {
      isAuthStateResolved: of(true),
      user$: of(null),
    });
    organizationServiceMock = jasmine.createSpyObj('OrganizationService', ['listMyOrganizations']);
    organizationServiceMock.listMyOrganizations.and.returnValue(of([] as any));

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: OrganizationService, useValue: organizationServiceMock },
      ],
    });

    service = TestBed.inject(UserResolver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null user without organization lookup when no uid is present', (done) => {
    Object.defineProperty(authServiceMock, 'user$', { value: of(null), configurable: true });

    service.resolve().subscribe((result) => {
      expect(result).toBeNull();
      expect(organizationServiceMock.listMyOrganizations).not.toHaveBeenCalled();
      done();
    });
  });

  it('should fetch organizations when user has uid and return same user', (done) => {
    const user = { uid: 'user-1' } as any;
    Object.defineProperty(authServiceMock, 'user$', { value: of(user), configurable: true });

    service.resolve().subscribe((result) => {
      expect(organizationServiceMock.listMyOrganizations).toHaveBeenCalled();
      expect(result).toBe(user);
      done();
    });
  });

  it('should still return user when organization lookup fails', (done) => {
    const user = { uid: 'user-1' } as any;
    Object.defineProperty(authServiceMock, 'user$', { value: of(user), configurable: true });
    organizationServiceMock.listMyOrganizations.and.returnValue(
      throwError(() => new Error('org lookup failed')),
    );

    service.resolve().subscribe((result) => {
      expect(result).toBe(user);
      done();
    });
  });
});
