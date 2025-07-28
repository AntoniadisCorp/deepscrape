import { Injectable } from '@angular/core';
import { catchError } from 'rxjs/internal/operators/catchError';
import { retry } from 'rxjs/internal/operators/retry';
import { Subject } from 'rxjs/internal/Subject';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';


@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket$: WebSocketSubject<any>;
  private serverUrl = 'ws://localhost:8000/ws/events';
  private messagesSubject$ = new Subject<any>();
  public messages$ = this.messagesSubject$.asObservable();

  constructor() {
    this.connect();
  }

  private connect() {
    this.socket$ = webSocket(this.serverUrl);

    this.socket$
      .pipe(
        retry({ count: 3, delay: 1000 }), // Retry on failure
        catchError((error) => {
          console.error('WebSocket connection failed:', error);
          throw error;
        })
      )
      .subscribe({
        next: (message) => this.messagesSubject$.next(message),
        error: (err) => console.error('WebSocket error:', err),
        complete: () => console.warn('WebSocket connection closed'),
      });
  }

  sendMessage(message: any) {
    this.socket$.next(message);
  }

  close() {
    this.socket$.complete();
  }
}
