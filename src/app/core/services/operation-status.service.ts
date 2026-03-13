import { Injectable } from '@angular/core';
import { tap, takeWhile } from 'rxjs/operators';
import { CrawlStatus } from '../types';
import { CrawlAPIService } from './crawlapi.service';
import { SnackBarType } from '../components';
import { CrawlOperationStatus } from '../enum';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({ providedIn: 'root' })
export class OperationStatusService {
  constructor(private crawlService: CrawlAPIService) {}

  getTaskStatusWithSnackbar(
    id: string,
    showSnackbar: (msg: string, type: SnackBarType) => void
  ): Observable<Pick<CrawlStatus, 'error' | 'status' | 'result'>> {
    return this.crawlService.getTaskStatus(id).pipe(
      tap((obj) => {
        const status = obj?.status || '';
        const result = obj?.result || null;
        const resultMessage = result?.status === 'Failed' ? result?.message : 'succesfully';
        if (
          [CrawlOperationStatus.COMPLETED, CrawlOperationStatus.CANCELED, CrawlOperationStatus.FAILED].includes(
            status as CrawlOperationStatus
          )
        ) {
          const messages: Record<CrawlOperationStatus, { message: string; type: SnackBarType }> = {
            [CrawlOperationStatus.COMPLETED]: { message: `Task completed ${resultMessage}!`, type: SnackBarType.success },
            [CrawlOperationStatus.CANCELED]: { message: `Task canceled ${resultMessage}!`, type: SnackBarType.info },
            [CrawlOperationStatus.FAILED]: { message: 'Task failed!', type: SnackBarType.error },
            [CrawlOperationStatus.READY]: { message: 'Task is ready to start.', type: SnackBarType.info },
            [CrawlOperationStatus.STARTED]: { message: 'Task has started.', type: SnackBarType.info },
            [CrawlOperationStatus.SCHEDULED]: { message: 'Task is scheduled.', type: SnackBarType.info },
            [CrawlOperationStatus.IN_PROGRESS]: { message: 'Task is in progress.', type: SnackBarType.info },
            [CrawlOperationStatus.PENDING]: { message: 'Task is in pending.', type: SnackBarType.info },
            [CrawlOperationStatus.PAUSED]: { message: 'Task is in paused.', type: SnackBarType.info },
          };
          const { message, type } = messages[status as CrawlOperationStatus];
          showSnackbar(message, type);
        }
      }),
      takeWhile((obj) => (obj?.status ?? '') !== '')
    );
  }
}