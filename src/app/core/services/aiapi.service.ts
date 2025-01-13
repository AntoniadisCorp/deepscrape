import { HttpClient, HttpDownloadProgressEvent, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { throwError } from 'rxjs/internal/observable/throwError';
import { catchError } from 'rxjs/internal/operators/catchError';
import { map } from 'rxjs/internal/operators/map';
import { tap } from 'rxjs/internal/operators/tap';
import { environment } from 'src/environments/environment';
import { arrayBufferToString, customUrlEncoder, sanitizeJSON, switchModelApiEndpoint } from '../functions';
import { API_ANTHROPIC, API_GROQAI, API_JINAAI, API_OPENAI } from '../variables';
import { scan } from 'rxjs/internal/operators/scan';
import { claudeAiApiStreamData, JinaOptions } from '../types';
import { filter } from 'rxjs/internal/operators/filter';
import { Subject } from 'rxjs/internal/Subject';
import { from } from 'rxjs/internal/observable/from';
import { mergeMap } from 'rxjs/internal/operators/mergeMap';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiAPIService {

  private CLAUDE_API_KEY: string = environment.ANTHROPIC_API_KEY
  private OPENAI_API_KEY: string = environment.OPENAI_API_KEY

  private GROQ_API_KEY: string = environment.GROQ_API_KEY
  private claudeAiEndpoint: string
  private openAiEndpoint: string

  private groqAiEndpoint: string

  private jinaAiEndpoint: string


  private subjectClaudeAI = new Subject<claudeAiApiStreamData>()
  private subjectOpenAI = new Subject<{ content: string, usage: any | null, role: any | null }>()

  constructor(private http: HttpClient) {

    // Replace with actual AI API endpoint each model
    this.claudeAiEndpoint = API_ANTHROPIC + '/messages'  // Updated URL
    this.openAiEndpoint = API_OPENAI + '/chat/completions' // Updated URL
    this.groqAiEndpoint = API_GROQAI + '/chat/completions' // Updated URL
    this.jinaAiEndpoint = API_JINAAI + '/'// Updated URL
  }



  sendToJinaAI(url: string, options: JinaOptions, cookies?: string): Observable<string> {

    const encodedUrl = environment.JINAAI_API_KEY !== '' ? url : customUrlEncoder(url);
    console.log("encodedUrl: ", encodedUrl, environment.JINAAI_API_KEY)
    const jinaAiReaderEndpoint: string = this.jinaAiEndpoint + encodedUrl
    const cookie = options.forwardCookies && cookies && cookies?.length ? { "X-Set-Cookie": cookies } : null // If cookies are provided, append them to the headers, )
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.JINAAI_API_KEY}`, // Replace with your actual API key
      'Accept': 'application/json',
      // "X-With-Links-Summary": "true",
      "X-With-Iframe": options.iframe,
      "X-Return-Format": "markdown",
      "X-Target-Selector": "body",
      "X-With-Generated-Alt": "true",
      ...cookie
    })
    return this.http.get(jinaAiReaderEndpoint, { headers/* , transferCache: true */, responseType: 'arraybuffer' })
      .pipe(
        map((response: ArrayBuffer) => JSON.parse(arrayBufferToString(response))),
        tap((response: any) => {

          const data = {
            code: response.code,
            title: response.data.title,
            status: response.status,
            url: response.data.url,
            tokens: response.data.usage.tokens
          }
          console.log('Response data:', data)
        }),
        map((response: any) => response.data.content),
        catchError(error => {
          console.error('Error in Jina AI API call:', error)
          throw error
        })

      )
  }

  sendToClaudeAI(content: string | { role: string, content: string }[], modelName: string = 'claude-3-5-sonnet-20241022', sys?: string): Observable<{ content: string, role: string, usage: any | null }> {
    const [model, apiEndpoint, API_KEY, apiName] = switchModelApiEndpoint(modelName, [this.claudeAiEndpoint, ""], [this.CLAUDE_API_KEY, ""])
    const headers = new HttpHeaders({
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      "anthropic-dangerous-direct-browser-access": "true",
    })

    const system = sys || `You are a helpful assistant.Extract all recipe information from website content also clean unnecessary special characters
    recipe details like image video link steps or any usage data and return in JSON format. If a field is missing, use null. 
    Do not say anything else.`/* `extract all product information from website content also clean unnecessary special characters
                     products details as an array and return in JSON format with four keys: 
                     code: number, price (number), title (string), productLink (string), discount (number). If a field is missing, use null. 
                     Do not say anything else.` */



    const messages = Array.isArray(content) ? content : [
      { "role": "user", "content": `${content}` }
    ];

    const body = {
      model, //  claude-3-5-sonnet-20240620
      "max_tokens": 4096,
      system,
      "messages": messages,
      stream: true
    }


    let previousText = '';
    let usage: { "prompt_tokens": number, "completion_tokens": number } = { prompt_tokens: 0, completion_tokens: 0 }

    return this.http.post(apiEndpoint, body, {
      headers,
      observe: 'events',
      responseType: 'text',
      reportProgress: true, withCredentials: true
    }).pipe(
      /* tap((event: HttpEvent<string>) => {

        switch (event.type) {
          case HttpEventType.DownloadProgress:
            // console.log('Uploaded ' + event.loaded + ' out of ' + event.total + ' bytes', Math.round((100 * event.loaded) / event.total!));
            break
          case HttpEventType.Response:
            console.log('Finished uploading!');
            break
          default:
            console.log(`event.type`, event.type)
            break
        }
      }),
       */
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
      mergeMap((text: string) => from(text.split('\n'))),
      filter(line => line.startsWith('data: ')),
      map(line => line.slice(5).trim()),
      map((text: string) => {
        const newText = text?.replace(/^data:\s*/, '')
        // Fix any structural issues (e.g., mismatched brackets)
        return newText
      }),
      map((line: string) => {
        // console.log('line', line)
        const parsed = JSON.parse(line)
        if (parsed?.type === 'message_stop') {
          return '{}'
        }
        return parsed
      }),

      // filter((response): response is claudeAiApiStreamData => response !== null),
      catchError(error => {
        console.error('Error in Claude AI API call:', error)
        throw error
      })

    ).pipe(
      scan((acc: any, chunk: claudeAiApiStreamData) => {

        if (chunk.type === 'content_block_delta' && chunk.delta && chunk.delta.text) {
          // console.log(`chunk type: `, chunk.type, ' role: ' + chunk?.message?.role, 'chunk text: ', chunk.delta?.text, 'chunk usage', chunk?.usage)
          // const newText = typeof acc?.content === 'string' ? acc?.content + chunk.delta?.text : chunk.delta?.text
          return { content: chunk.delta?.text, role: chunk?.message?.role, usage: chunk?.usage }
        } else if (chunk.type === 'message_delta') {
          usage.completion_tokens = chunk?.usage?.output_tokens
          return {
            content: chunk.delta?.text, role: chunk?.usage, usage
          }
        } else if (acc?.type === 'message_start') {
          usage.prompt_tokens = acc?.message?.usage?.input_tokens || 0
          usage.completion_tokens = acc?.message?.usage?.output_tokens || 0
          return { content: '', role: acc?.message?.role, usage }
        } else if (acc?.type === 'message_start') {
          return acc
        }

      }),
      map((response: { content: string, role: string, usage: any | null }) => ({
        content: response?.content,
        role: response?.role,
        usage: response?.usage
      }))
    )/* .subscribe({
      next: (parsedChunks: any) => {
        this.subjectClaudeAI.next(parsedChunks)
      },
      error: (error) => {
        // console.error('Error:', error)
        return this.subjectClaudeAI.error(error)
      },
      complete: () => {
        // console.log('Stream completed')
        return this.subjectClaudeAI.complete()
      }
    }) */
    // return this.subjectClaudeAI.asObservable()
  }

  sendToOpenAI(content: string | { role: string, content: string }[], modelName: string = 'gpt-4o-mini', sys?: string): Observable<{ content: string, usage: any | null, role: any | null }> {

    const [model, apiEndpoint, API_KEY, apiName] = switchModelApiEndpoint(modelName, [this.openAiEndpoint, this.groqAiEndpoint], [this.OPENAI_API_KEY, this.GROQ_API_KEY])

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${API_KEY}`,
      'content-type': 'application/json',
    })

    const system = sys || `You are a helpful assistant.Extract all recipe information from website content also clean unnecessary special characters
    recipe details like image video link steps or any usage data and return in JSON format. If a field is missing, use null. 
    Do not say anything else.` /* `extract all product information from website content also clean unnecessary special characters
    products details as an array and return in JSON format with four keys: 
    code: number, price (number), title (string), productLink (string), discount (number). If a field is missing, use null. 
    Do not say anything else.` */

    const messages = Array.isArray(content) ? content : [
      { "role": "system", "content": system },
      { "role": "user", "content": `${content}` }
    ];

    const body = {
      model,
      "max_tokens": 8000,
      "temperature": 0,
      "messages": messages,
      "stream": true,
      "stream_options": {
        "include_usage": true
      },
      "stop": null,
      "top_p": 1,
    }

    let previousText = '';

    return this.http.post(apiEndpoint, body, {
      headers,
      observe: 'events',
      responseType: 'text',
      reportProgress: true, withCredentials: true
    }).pipe(
      /* tap((event: HttpEvent<string>) => {
        switch (event.type) {
          case HttpEventType.DownloadProgress:
            // console.log('Uploaded ' + event.loaded + ' out of ' + event.total + ' bytes', Math.round((100 * event.loaded) / event.total!))
            break
          case HttpEventType.Response:
            console.log('Finished uploading!');
            break
          default:
            // console.log(`event.type`, event.type)
            break
        }
      }), */
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
          return '{}'
        }
        // Fix any structural issues (e.g., mismatched brackets)
        return newText
      }),
      map((line: string) => {
        // console.log('line', line)
        const parsed = JSON.parse(line)

        const choices = parsed?.choices?.length || 0
        const content = choices ? parsed?.choices[0].delta?.content : undefined


        const chooseUsage = (apiName === 'openai' ? parsed?.usage : parsed?.x_groq?.usage)
        const usage = chooseUsage // !choices ? chooseUsage : null

        return { content, usage, role: choices ? parsed?.choices[0].delta?.role : null }
      }),
      // filter((text: any) => text?.role !== "assistant" ? text?.content?.trim() !== '' : true), // Filter out assistant responses
      catchError((error) => {
        console.log('Error in Open AI API call:', error)
        return throwError(() => error)
      })
    )
    // takeWhile((text: string) => text?.length < 10000))
    /* .subscribe({
      next: (parsedChunks: any) => {
        this.subjectOpenAI.next(parsedChunks)
      },
      error: (error: any) => {
        console.error('Error in Open AI API call:', error)
        this.subjectOpenAI.error(error)
      },
      complete: () => {
        this.subjectOpenAI.complete()
      }
    }) */
    // return this.subjectOpenAI.asObservable()
  }


  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return throwError(() => 'Something bad happened; please try again later.');
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.subjectClaudeAI?.unsubscribe()
    this.subjectOpenAI?.unsubscribe()
  }
}
