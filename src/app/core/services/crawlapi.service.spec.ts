import { TestBed } from '@angular/core/testing';

import { CrawlapiService } from './crawlapi.service';

describe('CrawlapiService', () => {
  let service: CrawlapiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrawlapiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
