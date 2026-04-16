import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { getTestProviders } from 'src/app/testing';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose auth state observables', () => {
    expect(typeof service.isAuthenticated).toBe('function');
    expect(service.user$).toBeDefined();
  });

  it('should initialize with non-admin flag by default', () => {
    expect(service.isAdmin).toBe(false);
  });
});
