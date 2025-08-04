import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { API_CRAWL4AI } from '../variables';
import { HttpClient, HttpDownloadProgressEvent, HttpErrorResponse, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { catchError } from 'rxjs/internal/operators/catchError';
import { AuthService } from './auth.service';
import { arrayBufferToString, handleError } from '../functions';
import { map } from 'rxjs/internal/operators/map';
import { tap } from 'rxjs/internal/operators/tap';
import { CrawlPack, CrawlStatus, CrawlTask, JinaOptions } from '../types';
import { filter } from 'rxjs/internal/operators/filter';
import { mergeMap } from 'rxjs/internal/operators/mergeMap';
import { from } from 'rxjs/internal/observable/from';
import { environment } from 'src/environments/environment';
import { switchMap } from 'rxjs/internal/operators/switchMap';

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

  getTempTaskId(): Observable<string> {

    const crawl4AiEndpoint: string = this.crawl4AiEndpoint + "/job/temp-task-id"


    const headers = new HttpHeaders({
      // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Content-Type': 'application/json',
    })


    return this.http.get<{temp_task_id: string}>(crawl4AiEndpoint, {headers})
      .pipe(
        tap(res => {
          console.log(res.temp_task_id)
        }),
        map((res) => res.temp_task_id),
        catchError(handleError)
      )

  }

  getTaskId(tempTaskId: string): Observable<string> {

    const crawl4AiEndpoint: string = this.crawl4AiEndpoint + "/job/" + tempTaskId


    const headers = new HttpHeaders({
      // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Content-Type': 'application/json',
    })


    return this.http.get<{task_id: string}>(crawl4AiEndpoint, {headers})
      .pipe(
        tap(res => {
          console.log(res.task_id)
        }),
        map((res) => res.task_id),
        catchError(handleError)
      )

  }

  getTaskStatus(taskId: string): Observable<any> {
  
    const crawl4AiEndpoint: string = this.crawl4AiEndpoint + "/stream/job/status/" + taskId


    const headers = new HttpHeaders({
      // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    })

    let previousText = ''
    
    return this.http.get(crawl4AiEndpoint, { 
      headers/* , transferCache: true */,  
      observe: 'events',
      responseType: 'text',
      reportProgress: true, 
      // withCredentials: true 
    }).pipe(
      filter(event => event.type === HttpEventType.DownloadProgress || event.type === HttpEventType.Response),
      map(event => {
          const fullText = (event as HttpDownloadProgressEvent).partialText || ''
          const newText = fullText.slice(previousText.length)
          previousText = fullText
          // Process the chunk to handle boundaries and send as JSON
          let buffer = newText;
          let boundary: number;
          let result = '';
          while ((boundary = buffer.indexOf('\n')) !== -1) {
            const jsonChunk = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 1);
  
            if (jsonChunk) {
              result += `${jsonChunk}\n`; // Add the chunked data to the result
            }
          }
  
          return result;
        }),
        // tap((text: string) => { console.log(`event.type`, text.split('\n')[0]) }),
        switchMap((text: string) => text.split('\n')),
        filter(line => line.startsWith('data: ')),
        map(line => line.slice(5).trim()),
        map((text: string) => {
          const newText = text?.replace(/^data:\s*/, '')
          if (newText === '[DONE]') {
            return null
          }
          // Fix any structural issues (e.g., mismatched brackets)
          return newText
        }),
        map(line => {
            if (!line || line.trim() === '') return null; // Skip empty lines
            let jsonObject = null;
            try {
                jsonObject = JSON.parse(line); // Parse each completed JSON object
            } catch (e) {
                console.error('Failed to parse JSON chunk:', e);
            }
            return jsonObject;
        }),
      filter(line => line !== null), // Filter out null values
      map((jsonObject: CrawlStatus) => jsonObject.status),
      catchError(error => {
        console.error('Error in Crawl4 AI API call:', error)
        throw error
      })
    )

  }

  cancelTask(tempTaskId: string): Observable<any> {

    const crawl4AiEndpoint: string = this.crawl4AiEndpoint + "/job/cancel/" + tempTaskId

    const headers = new HttpHeaders({
      // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Content-Type': 'application/json'
    })
    // const body = {
    //   "temp_task_id": tempTaskId
    // }

    return this.http.put(crawl4AiEndpoint, {headers})
    .pipe(
      tap((value) => console.log(value)),
      catchError(handleError)
    )
  }
  
  crawlEnqueue(urls: string[], tempTaskId: string, crawlPack: CrawlPack ): Observable<CrawlTask> {

    const encodedUrl = environment.CRAWL4AI_API_KEY !== '' ? urls : urls;
    const crawl4AiReaderEndpoint: string = this.crawl4AiEndpoint + "/stream/job"

    const headers = new HttpHeaders({
      'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Accept': 'text/event-stream',
    })


    const body = {
      "urls": encodedUrl,
      "temp_task_id": tempTaskId,
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
        
        return completeString; // Return the last matched complete JSON string    
      }),
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
      filter(line => line !== null), // Filter out null values
      // tap( line => console.log(line)),
      catchError(error => {
        console.error('Error in Crawl4 AI API call:', error)
        throw error
      })
    );

  }
  
}


