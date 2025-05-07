import { TestBed } from '@angular/core/testing';

import { ExtensionService } from './extgrpc.service';

describe('ExtgrpcService', () => {
  let service: ExtensionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtensionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
