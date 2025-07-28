import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { API_CRAWL4AI } from '../variables';
import { HttpClient, HttpDownloadProgressEvent, HttpErrorResponse, HttpEventType, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/internal/operators/catchError';
import { AuthService } from './auth.service';
import { arrayBufferToString, handleError } from '../functions';
import { map } from 'rxjs/internal/operators/map';
import { tap } from 'rxjs/internal/operators/tap';
import { CrawlPack, CrawlTask, JinaOptions } from '../types';
import { filter } from 'rxjs/internal/operators/filter';
import { mergeMap } from 'rxjs/internal/operators/mergeMap';
import { from } from 'rxjs/internal/observable/from';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CrawlAPIService {

  private crawl4AiEndpoint: string
  constructor(private http: HttpClient, private authService: AuthService) { 

    this.crawl4AiEndpoint = API_CRAWL4AI + '/crawl' // Updated URL

    // initialize auth state
    this.authService.initAuth()
  }

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
  sendToCrawl4AI(url: string, options: JinaOptions, cookies?: string,
    content_type: "application/octet-stream" | "text/plain" | "application/json" | "text/event-stream" = "application/octet-stream"): Observable<string> {

    const encodedUrl = environment.CRAWL4AI_API_KEY !== '' ? url : url// customUrlEncoder(url);
    // console.log("encodedUrl: ", encodedUrl, environment?.CRAWL4AI_API_KEY)
    const crawl4AiReaderEndpoint: string = this.crawl4AiEndpoint
    // const cookie = options.forwardCookies && cookies && cookies?.length ? { "X-Set-Cookie": cookies } : null // If cookies are provided, append them to the headers, )
    const headers = new HttpHeaders({
      'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Accept': content_type as string,
      // "X-With-Links-Summary": "true",
      // "X-With-Iframe": options.iframe,
      // "X-Return-Format": "markdown",
      // "X-Target-Selector": "body",
      // "X-With-Generated-Alt": "true",
      // ...cookie
    })

    const body = {
      "urls": encodedUrl,
      "priority": 10,
    }

    return this.http.post(crawl4AiReaderEndpoint, body, { headers/* , transferCache: true */, responseType: 'arraybuffer' })
      .pipe(
        map((response: ArrayBuffer) => JSON.parse(arrayBufferToString(response))),
        tap((response: any) => {

          const data = {
            code: response.code,
            title: response.data.title,
            status: response.status,
            url: response.data.url,
            tokens: response.data.usage?.tokens
          }
          console.log('Response data:', data)
        }),
        map((response: any) => response.data.content),
        catchError(error => {
          console.error('Error in Crawl4 AI API call:', error)
          throw error
        })

      )
  }

  crawlEnqueue(urls: string[], crawlPack: CrawlPack ): Observable<CrawlTask> {

    const encodedUrl = environment.CRAWL4AI_API_KEY !== '' ? urls : urls;
    const crawl4AiReaderEndpoint: string = this.crawl4AiEndpoint + "/stream/job/"

    const headers = new HttpHeaders({
      'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Accept': 'text/event-stream',
    })


    const body = {
      "urls": encodedUrl,
      // "priority": 10,
      ...crawlPack.config.value,
    }
    // console.log(crawl4AiReaderEndpoint, body)
    return this.http.post(crawl4AiReaderEndpoint, body, { headers/* , transferCache: true */ })
      .pipe(
      tap((task: any) => {
        // console.log('response data:', task)
      }),
      map((job: any) => {
        // console.log('response data:', task)
        return {id: job.task_id, ...job} as CrawlTask
      }),
      catchError(error => {
        console.error('Error in Crawl4 AI API call:', error)
        throw error
      }))
  }

  getCrawlAIStream(url: string, taskId: string): Observable<any> {
    const encodedUrl = environment.CRAWL4AI_API_KEY !== '' ? url : url;
    // console.log("encodedUrl: ", encodedUrl, environment?.CRAWL4AI_API_KEY)
    const crawl4AiReaderEndpoint: string = this.crawl4AiEndpoint + "/stream/job/" + taskId

    const headers = new HttpHeaders({
      'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Accept': 'text/event-stream',
    })

    let previousText = ''
      
    return this.http.get(crawl4AiReaderEndpoint, { 
      headers/* , transferCache: true */,  
      observe: 'events',
      responseType: 'text',
      reportProgress: true, 
      withCredentials: true 
    }).pipe(
      filter(event => event.type === HttpEventType.DownloadProgress || event.type === HttpEventType.Response),
      map(event => {
        const fullText = (event as HttpDownloadProgressEvent).partialText || ''
        const newText = fullText.slice(previousText.length)
     
        previousText += newText; // Concatenate the new text
    
        // Match complete JSON objects in the concatenated text
        const regex = /(\{"status".*?\}"})/g;
        let completeString = '';
        let match;

        // Extract the last complete JSON object (if available)
        while ((match = regex.exec(previousText)) !== null) {
            completeString = match[1]; // Store the last complete match
        }

        // Clean up concatenatedText to keep only the unmatched part
        if (completeString) {
            // Adjust the concatenatedText to remove the complete segment if needed
            previousText = previousText.replace(completeString, '');
        }

        // console.log(completeString)
        
        return completeString; // Return the last matched complete JSON string
        /* try {
            return JSON.parse(line);
        } catch (e) {
            console.error('Failed to parse JSON chunk:', e, 'Line content:', line);
            return null; // Skipping invalid lines
        } */      
      }),
      // mergeMap((text: string) => from(text.split('\n'))),
      // map((line) => line.trim()),
      // tap( line => console.log(line)),
      map(line => {
          if (!line) return null; // Skip empty lines
          let jsonObject = null;
          try {
              jsonObject = JSON.parse(line); // Parse each completed JSON object
          } catch (e) {
              console.error('Failed to parse JSON chunk:', e);
          }
          return jsonObject;
      }),
      catchError(error => {
        console.error('Error in Crawl4 AI API call:', error)
        throw error
      })
    );

  }
  
}


