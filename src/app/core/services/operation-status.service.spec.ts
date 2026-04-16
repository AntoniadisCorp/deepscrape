import { OperationStatusService } from './operation-status.service';
import { CrawlAPIService } from './crawlapi.service';
import { of } from 'rxjs';
import { SnackBarType } from '../components';
import { CrawlOperationStatus } from '../enum';

describe('OperationStatusService', () => {
  let service: OperationStatusService;
  let crawlServiceMock: jasmine.SpyObj<CrawlAPIService>;

  beforeEach(() => {
    crawlServiceMock = jasmine.createSpyObj('CrawlAPIService', ['getTaskStatus']);
    service = new OperationStatusService(crawlServiceMock);
  });

  it('should emit task status values from the crawl service', (done) => {
    crawlServiceMock.getTaskStatus.and.returnValue(of({ status: CrawlOperationStatus.IN_PROGRESS, result: null } as any));

    service.getTaskStatusWithSnackbar('task-1', () => undefined).subscribe((value) => {
      expect(value.status).toBe(CrawlOperationStatus.IN_PROGRESS);
      done();
    });
  });

  it('should show a success snackbar when a task completes', (done) => {
    const snackbarSpy = jasmine.createSpy('showSnackbar');
    crawlServiceMock.getTaskStatus.and.returnValue(
      of({ status: CrawlOperationStatus.COMPLETED, result: { status: 'Success', message: 'ok' } } as any),
    );

    service.getTaskStatusWithSnackbar('task-1', snackbarSpy).subscribe({
      next: () => {
        expect(snackbarSpy).toHaveBeenCalledWith('Task completed successfully!', SnackBarType.success);
        done();
      },
    });
  });

  it('should show an error snackbar when a task fails', (done) => {
    const snackbarSpy = jasmine.createSpy('showSnackbar');
    crawlServiceMock.getTaskStatus.and.returnValue(
      of({ status: CrawlOperationStatus.FAILED, result: { status: 'Failed', message: 'bad crawl' } } as any),
    );

    service.getTaskStatusWithSnackbar('task-1', snackbarSpy).subscribe({
      next: () => {
        expect(snackbarSpy).toHaveBeenCalledWith('Task failed!', SnackBarType.error);
        done();
      },
    });
  });
});
