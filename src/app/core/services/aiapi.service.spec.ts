import { TestBed } from '@angular/core/testing';

import { AiAPIService } from './aiapi.service';
import { getTestProviders } from 'src/app/testing';

describe('AiserviceService', () => {
  let service: AiAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(AiAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
