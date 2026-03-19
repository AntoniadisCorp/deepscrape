import { TestBed } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';
import { getTestProviders } from 'src/app/testing';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(AnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
