import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { interceptorGuard } from './interceptor.guard';

describe('interceptorGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => interceptorGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
