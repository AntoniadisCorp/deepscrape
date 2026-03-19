import { TestBed } from '@angular/core/testing';

import { CrawlAPIService } from './crawlapi.service';
import { getTestProviders } from 'src/app/testing';

describe('CrawlAPIService', () => {
  let service: CrawlAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(CrawlAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
