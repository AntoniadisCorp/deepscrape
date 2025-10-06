import { Injectable } from '@angular/core'
// import { API_CRAWL4AI } from '../variables'
import { HttpClient, HttpDownloadProgressEvent, HttpErrorResponse, HttpEventType, HttpHeaders, HttpResponse, HttpEvent } from '@angular/common/http'
import { catchError, map, tap, filter, switchMap, scan, mergeMap, finalize } from 'rxjs/operators'
import { from, Observable, throwError } from 'rxjs'
import { AuthService } from './auth.service'
import { arrayBufferToString, handleError } from '../functions'
import { CrawlOperation, CrawlPack, CrawlResults, CrawlStatus, CrawlStreamBatch, CrawlTask, JinaOptions } from '../types'
import { environment } from 'src/environments/environment'
import { API_CRAWL4AI_URL } from '../variables'

@Injectable({
  providedIn: 'root'
})
export class CrawlAPIService {

  private crawl4AiEndpoint: string
  constructor(private http: HttpClient, private authService: AuthService) { 

    this.crawl4AiEndpoint = (environment.production ? environment.API_CRAWL4AI_URL + '/api/v1' : 
      API_CRAWL4AI_URL) + '/crawl' // API_CRAWL4AI // Updated URL

    // initialize auth state
    // this.authService.initAuth()
  }

  
  sendToCrawl4AI(url: string, options: JinaOptions, cookies?: string,
    content_type: "application/octet-stream" | "text/plain" | "application/json" | "text/event-stream" = "application/octet-stream"): Observable<string> {

    const encodedUrl = environment.CRAWL4AI_API_KEY !== '' ? url : url// customUrlEncoder(url)
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
          throw throwError(() => error)
        })

      )
  }

  getTaskId(taskId: string): Observable<string> {

    const crawl4AiEndpoint: string = this.crawl4AiEndpoint + "/job/" + taskId


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
        let buffer = newText
        let boundary: number
        let result = ''
        while ((boundary = buffer.indexOf('\n')) !== -1) {
          const jsonChunk = buffer.slice(0, boundary).trim()
          buffer = buffer.slice(boundary + 1)

          if (jsonChunk) {
            result += `${jsonChunk}\n` // Add the chunked data to the result
          }
        }

        return result
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
      filter((line: string | null) => line !== null), // Filter out null values here
      map((line: string) => { // Now 'line' is guaranteed to be a string
          if (!line || line.trim() === '') return null // Skip empty lines
          let jsonObject = null
          try {
              jsonObject = JSON.parse(line) // Parse each completed JSON object
          } catch (e: any) { // Explicitly type error
              console.error('Failed to parse JSON chunk:', e)
          }
          return jsonObject
      }),
      filter((line: any) => line !== null), // Filter out null values again after JSON parsing
      // tap((line: any) => console.log(line)),
      map((jsonObject: CrawlStatus): Pick<CrawlStatus, 'error' | 'status' | 'result'> => ({
        status: jsonObject.status, 
        result: {
          status: jsonObject.result?.status || 'Completed',
          message: jsonObject.result?.message || ''
        },
        error: jsonObject?.error
    }
    )),
      catchError((error: any) => {
        console.error('Error in Crawl4 AI API call:', error)
        throw throwError(() => error)
      })
    )

  }

  cancelTask(taskId: string): Observable<any> {

    const crawl4AiEndpoint: string = this.crawl4AiEndpoint + `/job/${taskId}/cancel`

    const headers = new HttpHeaders({
      // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Content-Type': 'application/json'
    })
    const body = null
    return this.http.put(crawl4AiEndpoint, body, {headers})
    .pipe(
      // tap((value) => console.log(value)),
      catchError(handleError)
    )
  }
  
  multiCrawlEnqueue(urls: string[], operationData: CrawlOperation, crawlPack: CrawlPack ): Observable<CrawlTask> {

    const URLs = urls // environment.CRAWL4AI_API_KEY !== '' ? urls.map(url => customUrlEncoder(url)) : urls
    const crawl4AiReaderEndpoint: string = this.crawl4AiEndpoint + "/stream/job"

    const headers = new HttpHeaders({
      // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Accept': 'application/json',
    })

    const body = {
      "urls": URLs,
      "operation_data": operationData,
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
        return {
          id: job.task_id,
          operationId: job.operation_id, 
          ...job} as CrawlTask
      }),
      catchError(error => {
        console.error('Error in Crawl4 AI API call:', error)
        throw throwError(() => error)
      }))
  }

  streamTaskResults(url: string, taskId: string): Observable<any> {
    // const encodedUrl = environment.CRAWL4AI_API_KEY !== '' ? url : url
    // console.log("encodedUrl: ", encodedUrl, environment?.CRAWL4AI_API_KEY)
    const crawl4AiReaderEndpoint: string = /* url ||  */(this.crawl4AiEndpoint + "/stream/job/" + taskId)

    const headers = new HttpHeaders({
      // 'api-key': `Bearer ${this.authService.token}`, // this is for the ssr express server `,
      'Authorization': `Bearer ${this.authService.token}`, // this is for the python fastapi server
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    let previousText = '' // Persistent buffer for incomplete lines
    let buffer = '' // To accumulate new text chunks
    let isErrorState = false // Track if we've encountered an error
    return this.http.get(crawl4AiReaderEndpoint, {
      headers/* , transferCache: true */,
      observe: 'events',
      responseType: 'text',
      reportProgress: true,
      withCredentials: true
    }).pipe(
      filter((event: HttpEvent<string>): event is HttpDownloadProgressEvent | HttpResponse<string> =>
        event.type === HttpEventType.DownloadProgress || event.type === HttpEventType.Response
      ),
      map(event => {
        // if (event.type === HttpEventType.DownloadProgress && event.partialText) {
          
        //   // console.log('Final full partialText  received:', )
        // } else if (event.type === HttpEventType.Response) {
        //   // previousText = event.body as string
        //   // newText = previousText
        //   // console.log('Final full textbody  received:', )
        // }
        const fullText = (event as HttpDownloadProgressEvent).partialText || ''
        const newText = fullText.slice(previousText.length)
        previousText = fullText


        if (!newText) return [] // No new text to process

        // Split by newline to get complete chunks
        const lines = (buffer + newText).split('\n')
        // console.log('Received lines:', lines.length, lines, '...')

        // Buffer the last potentially incomplete line for next chunk
        if (lines.length && lines[lines.length - 1] !== '') {
          buffer = lines.pop() || ''
        } else {
          buffer = ''
        }
        // console.log("buffer: ", buffer, previousText)
        return lines.filter(line => line.trim().length > 0) // Only return non-empty lines
      }),
      // Flatten array of lines into individual lines
      mergeMap(lines => from(lines)), // Flatten array to stream
      // Handle event types
      map(line => {
        // Handle event: error lines
        if (line.startsWith('event: error')) {
          isErrorState = true;
          return line;
        }
        // Handle data: lines
        if (line.startsWith('data: ')) {
          return line.slice(6).trim();
        }
        return line;
      }),

      // Skip the [DONE] message but log it
      filter(text => {
        if (text === '[DONE]') {
          console.log('Stream completed with [DONE] marker');
          return false;
        }
        return text.length > 0;
      }),

      // Parse JSON objects from text
      map((line: string) => {
        if (!line) return null;
        
        // Special handling for error events
        if (isErrorState && line.startsWith('{')) {
          isErrorState = false;
          try {
            const errorObj = JSON.parse(line);
            throw new Error(errorObj.error || 'Server error');
          } catch (e) {
            console.error('Error event received:', e);
            throw e;
          }
        }
        
        // Regular data parsing
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error('Failed to parse JSON chunk:', e, line);
          return null;
        }
      }),
      // tap((line: string | null) => { 
      //   const chunkIndexMatch = line?.match(/"chunk_index":\s*\"(\d+)\"/)
      //   const chunkIndex = chunkIndexMatch ? parseInt(chunkIndexMatch[1], 10) : null
      //   console.log('Extracted chunk_index:', chunkIndex)
      // }),
      // Filter out null values
      filter((parsed: CrawlStreamBatch | null): parsed is CrawlStreamBatch => parsed !== null),
      // tap((line: CrawlStreamBatch) => console.log('Crawl4AI Stream Line:', line.chunk_index, line.message)), // Explicitly type line as any

      // Add progress calculation
      map((data: CrawlStreamBatch) => {
        // Calculate progress if chunk_index and total_chunks are available
        if (data.chunk_index !== undefined && data.total_chunks !== undefined) {
          const current = parseInt(data.chunk_index, 10)
          const total = parseInt(data.total_chunks, 10)
          if (!isNaN(current) && !isNaN(total) && total > 0) {
            data.progress = Math.min(Math.round((current / total) * 100), 99);
          }
        }
        return data
      }),

      catchError((error: any) => { // Explicitly type error
        console.error('Error in Crawl4 AI API call:', error)
        return throwError(() => error)
      }),
      finalize(() => {
        // Clear the buffer when the observable completes or errors
        previousText = '';
        buffer = '';
        isErrorState = false;
        console.log('Stream finalized, resources cleaned up')
      })
    )

  }
  
}
