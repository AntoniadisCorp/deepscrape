import { TestBed } from '@angular/core/testing';

import { OperationStatusService } from './operation-status.service';

describe('OperationStatusService', () => {
  let service: OperationStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OperationStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
