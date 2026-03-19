import { TestBed } from '@angular/core/testing';

import { MachineStoreService } from './machine-store.service';
import { getTestProviders } from 'src/app/testing';

describe('MachineStoreService', () => {
  let service: MachineStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(MachineStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
