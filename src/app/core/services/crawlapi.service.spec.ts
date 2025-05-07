import { TestBed } from '@angular/core/testing';

import { CrawlAPIService } from './crawlapi.service';

describe('CrawlAPIService', () => {
  let service: CrawlAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrawlAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
