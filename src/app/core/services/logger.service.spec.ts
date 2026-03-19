import { TestBed } from '@angular/core/testing';

import { LoggerService } from './logger.service';
import { getTestProviders } from 'src/app/testing';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
