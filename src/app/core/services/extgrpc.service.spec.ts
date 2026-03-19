import { TestBed } from '@angular/core/testing';

import { ExtensionService } from './extgrpc.service';
import { getTestProviders } from 'src/app/testing';

describe('ExtgrpcService', () => {
  let service: ExtensionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(ExtensionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
