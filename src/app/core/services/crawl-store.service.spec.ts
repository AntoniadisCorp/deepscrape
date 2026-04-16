import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

import { CrawlStoreService } from './crawl-store.service';
import { getTestProviders } from 'src/app/testing';

describe('CrawlStoreService', () => {
  let service: CrawlStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(CrawlStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose operations and pagination streams', () => {
    expect(service.operations$).toBeDefined();
    expect(service.totalPages$).toBeDefined();
    expect(service.inTotal$).toBeDefined();
  });

  it('should initialize total pages with 1', async () => {
    const pages = await firstValueFrom(service.totalPages$.pipe(take(1)));
    expect(pages).toBeGreaterThanOrEqual(1);
  });
});
