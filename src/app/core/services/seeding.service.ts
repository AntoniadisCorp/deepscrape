import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { CrawlOperation, CrawlPack, CrawlTask, SeederRequest, SeederResult } from '../types';
import { AuthService } from './auth.service';
import { API_CRAWL4AI_URL } from '../variables';
import { environment } from 'src/environments/environment'
import { CrawlAPIService } from './crawlapi.service';

@Injectable({ providedIn: 'root' })
export class SeedingService {
  private crawl4AiEndpoint: string

  constructor(private http: HttpClient, private authService: AuthService, private crawlService: CrawlAPIService) {

    this.crawl4AiEndpoint = (environment.production ? environment.API_CRAWL4AI_URL + '/api/v1' :
      API_CRAWL4AI_URL) + '/seeder' // API_CRAWL4AI // Updated URL
  }
  cancelTask(taskId: string): Observable<any> {
    return this.crawlService.cancelTask(taskId)
  }

  multiSeedEnqueue(operationData: CrawlOperation, seederReq: SeederRequest): Observable<CrawlTask> {


    const crawl4AiReaderEndpoint: string = this.crawl4AiEndpoint + "/stream/job/multi-research"

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Accept': 'application/json',
    })

    const body = {
      "operation_data": operationData,
      // "priority": 10,
      ...seederReq,
    }
    // console.log(crawl4AiReaderEndpoint, body)
    return this.http.post(crawl4AiReaderEndpoint, body, { headers/* , transferCache: true */ })
      .pipe(
        tap((task: any) => {
          // console.log('response data:', task)
        }),
        map((job: any) => {
          return {
            id: job.task_id,
            operationId: job.operation_id,
            ...job
          } as CrawlTask
        }),
        catchError(error => {
          console.error('Error in Seeder Enqueue API call:', error)
          throw throwError(() => error)
        }))
  }

  streamTaskResults(url: string, taskId: string): Observable<any> {
    const crawl4AiEndpoint: string = /* url ||  */this.crawl4AiEndpoint.replace('/seeder', '/crawl') + "/stream/job/" + taskId

    return this.crawlService.streamTaskResults(crawl4AiEndpoint, taskId)
  }
  /* TODO:
  *
  */

}
