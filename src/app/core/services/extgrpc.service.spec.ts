import { TestBed } from '@angular/core/testing';

import { ExtgrpcService } from './extgrpc.service';

describe('ExtgrpcService', () => {
  let service: ExtgrpcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtgrpcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
