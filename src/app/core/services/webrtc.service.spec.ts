import { WebRtcService } from './webrtc.service';
import { NAVIGATOR } from '../providers';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';

describe('WebRtcService', () => {
  let service: WebRtcService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: {} },
        { provide: NAVIGATOR, useValue: navigator },
        { provide: DOCUMENT, useValue: document },
      ],
    });

    service = TestBed.runInInjectionContext(
      () => new WebRtcService(TestBed.inject(HttpClient), TestBed.inject(NAVIGATOR), TestBed.inject(DOCUMENT)),
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose websocket state as closed initially', () => {
    expect(service.socketOpen).toBe(false);
  });

  it('should expose peer connection as disconnected initially', () => {
    expect(service.peerConnected).toBe(false);
    expect(service.connected).toBe(false);
  });

  it('should report peer connection as connected when state is connected', () => {
    (service as any).pc = {};
    (service as any)._state = 'connected';

    expect(service.peerConnected).toBe(true);
  });

  it('should report full connection only when peer and websocket are both ready', () => {
    (service as any).pc = {};
    (service as any)._state = 'connected';
    (service as any).wsSubject$ = { closed: false };

    expect(service.connected).toBe(true);
  });
});
