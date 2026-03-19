import { TestBed } from '@angular/core/testing';

import { UserResolver } from './user-resolver.service';
import { getTestProviders } from 'src/app/testing';

describe('UserResolver', () => {
  let service: UserResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(UserResolver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
