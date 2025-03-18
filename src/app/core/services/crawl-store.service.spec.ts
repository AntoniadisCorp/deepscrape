import { TestBed } from '@angular/core/testing';

import { CrawlStoreService } from './crawl-store.service';

describe('CrawlStoreService', () => {
  let service: CrawlStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrawlStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
