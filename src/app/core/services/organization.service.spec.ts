import { TestBed } from '@angular/core/testing';

import { OrganizationService } from './organization.service';
import { getTestProviders } from 'src/app/testing';
import { AuthService } from './auth.service';
import { AuthzService } from './authz.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { API_ORGANIZATIONS } from '../variables';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpMock: HttpTestingController;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let authzServiceMock: jasmine.SpyObj<AuthzService>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', [], { token: 'test-token' });
    authzServiceMock = jasmine.createSpyObj('AuthzService', ['setActiveOrgId'], {
      activeOrgId: null,
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ...getTestProviders(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthzService, useValue: authzServiceMock },
        OrganizationService,
      ],
    });

    service = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should list user organizations', () => {
    const mockOrgs = [
      { id: 'org-1', name: 'Org 1', slug: 'org-1', ownerId: 'user-1' },
      { id: 'org-2', name: 'Org 2', slug: 'org-2', ownerId: 'user-2' },
    ];

    service.listMyOrganizations().subscribe((response) => {
      expect(response.organizations).toEqual(mockOrgs);
    });

    const req = httpMock.expectOne(API_ORGANIZATIONS);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({ organizations: mockOrgs });
  });

  it('should set active org when listing organizations', () => {
    const mockOrgs = [{ id: 'org-1', name: 'Org 1', slug: 'org-1', ownerId: 'user-1' }];

    service.listMyOrganizations().subscribe();

    const req = httpMock.expectOne(API_ORGANIZATIONS);
    req.flush({ organizations: mockOrgs });

    expect(authzServiceMock.setActiveOrgId).toHaveBeenCalledWith('org-1');
  });

  it('should create organization', () => {
    const orgName = 'New Organization';
    const mockResponse = { id: 'org-123' };

    service.createOrganization(orgName).subscribe((response) => {
      expect(response.id).toBe('org-123');
    });

    const req = httpMock.expectOne(API_ORGANIZATIONS);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe(orgName);
    req.flush(mockResponse);
  });

  it('should handle organization creation errors', () => {
    service.createOrganization('Test Org').subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne(API_ORGANIZATIONS);
    req.error(new ErrorEvent('Network error'), { status: 500 });
  });
});
