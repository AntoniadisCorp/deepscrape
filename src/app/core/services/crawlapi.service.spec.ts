import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { CrawlAPIService } from './crawlapi.service';
import { getTestProviders } from 'src/app/testing';
import { AuthService } from './auth.service';

describe('CrawlAPIService', () => {
  let service: CrawlAPIService;
  let httpMock: HttpTestingController;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', [], {
      token: 'token-123',
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [...getTestProviders(), { provide: AuthService, useValue: authServiceMock }],
    });

    service = TestBed.inject(CrawlAPIService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should map task id from getTaskId response', (done) => {
    service.getTaskId('task-1').subscribe((taskId) => {
      expect(taskId).toBe('task-1');
      done();
    });

    const req = httpMock.expectOne((request) => request.method === 'GET' && request.url.includes('/job/task-1'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({ task_id: 'task-1' });
  });

  it('should send cancellation request for task id', () => {
    service.cancelTask('task-2').subscribe((result) => {
      expect(result).toEqual({ canceled: true });
    });

    const req = httpMock.expectOne((request) => request.method === 'PUT' && request.url.endsWith('/task-2/cancel'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({ canceled: true });
  });

  it('should map enqueue response into CrawlTask shape', (done) => {
    const operationData = { id: 'op-1' } as any;
    const crawlPack = { config: { value: { markdown: true } } } as any;

    service.multiCrawlEnqueue(['https://example.com'], operationData, crawlPack).subscribe((task) => {
      expect(task.id).toBe('task-10');
      expect(task.operationId).toBe('op-1');
      done();
    });

    const req = httpMock.expectOne((request) => request.method === 'POST' && request.url.endsWith('/crawl/stream/job'));
    expect(req.request.body.urls).toEqual(['https://example.com']);
    req.flush({ task_id: 'task-10', operation_id: 'op-1' });
  });
});
