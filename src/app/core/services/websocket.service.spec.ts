import { TestBed } from '@angular/core/testing';

import { WebSocketService } from './websocket.service';
import { getTestProviders } from 'src/app/testing';

describe('WebsocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(WebSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
