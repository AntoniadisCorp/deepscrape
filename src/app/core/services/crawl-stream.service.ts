import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CRAWL4AI_URL } from '../variables';
import { AuthService } from './auth.service';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CrawlStreamService {
  private crawl4AiEndpoint: string
  constructor(private zone: NgZone, private authService: AuthService) {
    this.crawl4AiEndpoint = API_CRAWL4AI_URL + '/crawl' // Updated URL
  }

  /**
    * Method for creation of the EventSource instance
    * @param url - SSE server api path
    * @param options - configuration object for SSE
    */
   getEventSource(url: string, options: EventSourceInit): EventSource {
       return new EventSource(url, options);
   }

  streamCrawlResults(taskId: string, options?: EventSourceInit): Observable<any> {
    return new Observable(observer => {

      const headers = new HttpHeaders({
        // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
        'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
        'Accept': 'text/event-stream',
      })
      const url: string = this.crawl4AiEndpoint + `/stream/job/${taskId}`
      const eventSource = this.getEventSource(url, options = { withCredentials: true })

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          if (event.data === '[DONE]') {
            observer.complete();
            eventSource.close();
          } else {
            try {
              observer.next(JSON.parse(event.data));
            } catch {
              observer.next(event.data);
            }
          }
        });
      };

      eventSource.onerror = (error) => {
        this.zone.run(() => {
          observer.error(error);
          eventSource.close();
        });
      }

      return () => {
        eventSource.close()
      };
    });
  }
}