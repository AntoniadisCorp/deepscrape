import { TestBed } from '@angular/core/testing';

import { SeedingService } from './seeding.service';
import { getTestProviders } from 'src/app/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { CrawlAPIService } from './crawlapi.service';
import { of } from 'rxjs';

describe('SeedingService', () => {
  let service: SeedingService;
  let httpMock: HttpTestingController;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let crawlServiceMock: jasmine.SpyObj<CrawlAPIService>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', [], { token: 'test-token' });
    crawlServiceMock = jasmine.createSpyObj('CrawlAPIService', ['cancelTask']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ...getTestProviders(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: CrawlAPIService, useValue: crawlServiceMock },
        SeedingService,
      ],
    });

    service = TestBed.inject(SeedingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should cancel seeding task', (done) => {
    const taskId = 'task-123';
    crawlServiceMock.cancelTask.and.returnValue(of({}));

    service.cancelTask(taskId).subscribe({
      next: () => {
        expect(crawlServiceMock.cancelTask).toHaveBeenCalledWith(taskId);
        done();
      },
    });
  });

  it('should submit multi-seed enqueue request with proper headers', () => {
    const operationData = { url: 'https://example.com' } as any;
    const seederReq = { action: 'extract' } as any;

    service.multiSeedEnqueue(operationData, seederReq).subscribe({
      next: () => {
        expect(true).toBe(true);
      },
    });

    const req = httpMock.expectOne((r) => r.url.includes('/seeder/'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({ taskId: 'task-123' });
  });

  it('should handle seeding errors', () => {
    const operationData = { url: 'https://example.com' } as any;
    const seederReq = { action: 'extract' } as any;

    service.multiSeedEnqueue(operationData, seederReq).subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne((r) => r.url.includes('/seeder/'));
    req.error(new ErrorEvent('Network error'), { status: 500 });
  });
});
