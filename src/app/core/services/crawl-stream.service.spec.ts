import { TestBed } from '@angular/core/testing';

import { CrawlStreamService } from './crawl-stream.service';

describe('CrawlStreamService', () => {
  let service: CrawlStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrawlStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
