import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { API_CRAWL4AI } from '../variables';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/internal/operators/catchError';
import { AuthService } from './auth.service';
import { throwError } from 'rxjs/internal/observable/throwError';

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
        catchError(this.handleError)
      )
  }


  private handleError(error: HttpErrorResponse | any): Observable<never> {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return throwError(() => 'Something bad happened; please try again later.');
  }
}
