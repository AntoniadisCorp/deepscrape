import { TestBed } from '@angular/core/testing';

import { LoadingService } from './loading.service';
import { getTestProviders } from 'src/app/testing';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
