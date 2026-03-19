import { TestBed } from '@angular/core/testing';

import { WebRtcService } from './webrtc.service';
import { getTestProviders } from 'src/app/testing';

describe('WebRtcService', () => {
  let service: WebRtcService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(WebRtcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
