import { TestBed } from '@angular/core/testing';

import { AuthzService } from './authz.service';
import { getTestProviders } from 'src/app/testing';

describe('AuthzService', () => {
  let service: AuthzService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: getTestProviders(),
    });

    service = TestBed.inject(AuthzService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should provide authorization check method', () => {
    expect(service.can$).toBeDefined();
    expect(typeof service.can$).toBe('function');
  });

  it('should provide membership ready observable', () => {
    expect(service.membershipsReady$).toBeDefined();
  });

  it('should provide memberships observable', () => {
    expect(service.memberships$).toBeDefined();
  });

  it('should expose activeOrgId value', () => {
    expect(service.activeOrgId).toBeDefined();
  });
});
