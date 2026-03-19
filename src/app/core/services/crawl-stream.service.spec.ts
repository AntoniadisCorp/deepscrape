import { TestBed } from '@angular/core/testing';

import { CrawlStreamService } from './crawl-stream.service';
import { getTestProviders } from 'src/app/testing';

describe('CrawlStreamService', () => {
  let service: CrawlStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(CrawlStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
