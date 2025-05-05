import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { API_CRAWL4AI } from '../variables';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/internal/operators/catchError';
import { AuthService } from './auth.service';
import { throwError } from 'rxjs/internal/observable/throwError';
import { handleError } from '../functions';

@Injectable({
  providedIn: 'root'
})
export class CrawlAPIService {

  constructor(private http: HttpClient, private authService: AuthService) { }

  getfromCrawl4Ai(): Observable<any> {

    const crawl4AiReaderEndpoint: string = API_CRAWL4AI + '/user/data'
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.token}`,
      'Accept': 'application/json',
    })

    return this.http.get(crawl4AiReaderEndpoint, { headers, responseType: 'text' })
      .pipe(
        catchError(handleError)
      )
  }
}
