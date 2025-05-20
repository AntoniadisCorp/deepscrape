import { TestBed } from '@angular/core/testing';

import { MachineStoreService } from './machine-store.service';

describe('MachineStoreService', () => {
  let service: MachineStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MachineStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
