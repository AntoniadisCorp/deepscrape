import { TestBed } from '@angular/core/testing';

import { AiAPIService } from './aiapi.service';

describe('AiserviceService', () => {
  let service: AiAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
