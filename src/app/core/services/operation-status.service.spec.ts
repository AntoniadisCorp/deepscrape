import { TestBed } from '@angular/core/testing';

import { OperationStatusService } from './operation-status.service';
import { getTestProviders } from 'src/app/testing';

describe('OperationStatusService', () => {
  let service: OperationStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(OperationStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
