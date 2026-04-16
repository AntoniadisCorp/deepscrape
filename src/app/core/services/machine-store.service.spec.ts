import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

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

  it('should expose machine and pagination streams', () => {
    expect(service.machines$).toBeDefined();
    expect(service.totalPages$).toBeDefined();
    expect(service.inTotal$).toBeDefined();
  });

  it('should initialize total pages with at least one page', async () => {
    const pages = await firstValueFrom(service.totalPages$.pipe(take(1)));
    expect(pages).toBeGreaterThanOrEqual(1);
  });
});
