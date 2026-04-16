import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { WebSocketService } from './websocket.service';
import { getTestProviders } from 'src/app/testing';
import { AuthService } from './auth.service';

describe('WebsocketService', () => {
  let service: WebSocketService;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', [], {
      token: 'token-123',
    });

    TestBed.configureTestingModule({
      providers: [...getTestProviders(), { provide: AuthService, useValue: authServiceMock }],
    });

    service = TestBed.inject(WebSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty task status list', () => {
    expect(service.getTaskStatuses()).toEqual([]);
  });

  it('should not connect task tracking when task ids are empty', () => {
    const consoleSpy = jasmine.isSpy(console.error)
      ? (console.error as jasmine.Spy)
      : spyOn(console, 'error');

    service.connectAndTrackTasks([]);

    expect(consoleSpy).toHaveBeenCalledWith('No task IDs provided');
  });

  it('should expose current task statuses from internal subject', () => {
    const statuses = [{ task_id: 'task-1', status: 'COMPLETED', timestamp: 1 } as any];
    (service as any).taskStatusSubject.next(statuses);

    expect(service.getTaskStatuses()).toEqual(statuses);
  });

  it('should disconnect task socket when requested', () => {
    const fakeSocket = {
      complete: jasmine.createSpy('complete'),
    } as any;

    (service as any).taskSocket$ = fakeSocket;
    service.disconnectTaskSocket();

    expect(fakeSocket.complete).toHaveBeenCalled();
    expect((service as any).taskSocket$).toBeNull();
  });
});
