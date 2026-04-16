import { NgZone } from '@angular/core';

import { CrawlStreamService } from './crawl-stream.service';
import { AuthService } from './auth.service';

describe('CrawlStreamService', () => {
  let service: CrawlStreamService;
  let zone: NgZone;
  let authServiceMock: Pick<AuthService, 'token'>;

  beforeEach(() => {
    zone = { run: (fn: () => void) => fn() } as NgZone;
    authServiceMock = { token: 'token-123' } as Pick<AuthService, 'token'>;
    service = new CrawlStreamService(zone, authServiceMock as AuthService);
  });

  it('should emit parsed json payloads from the event stream', (done) => {
    const fakeEventSource = {
      close: jasmine.createSpy('close'),
      onmessage: null as ((event: MessageEvent<string>) => void) | null,
      onerror: null as ((error: Event) => void) | null,
    } as unknown as EventSource;

    const getEventSourceSpy = spyOn(service, 'getEventSource').and.returnValue(fakeEventSource);

    service.streamCrawlResults('task-1').subscribe({
      next: (value) => {
        expect(getEventSourceSpy).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/crawl\/stream\/job\/task-1$/),
          { withCredentials: true },
        );
        expect(value).toEqual({ status: 'IN_PROGRESS' });
        done();
      },
    });

    fakeEventSource.onmessage?.({ data: '{"status":"IN_PROGRESS"}' } as MessageEvent<string>);
  });

  it('should complete and close the stream when done marker is received', () => {
    const fakeEventSource = {
      close: jasmine.createSpy('close'),
      onmessage: null as ((event: MessageEvent<string>) => void) | null,
      onerror: null as ((error: Event) => void) | null,
    } as unknown as EventSource;

    spyOn(service, 'getEventSource').and.returnValue(fakeEventSource);
    let completed = false;

    service.streamCrawlResults('task-1').subscribe({
      complete: () => {
        completed = true;
      },
    });

    fakeEventSource.onmessage?.({ data: '[DONE]' } as MessageEvent<string>);

    expect(completed).toBe(true);
    expect(fakeEventSource.close).toHaveBeenCalled();
  });
});
