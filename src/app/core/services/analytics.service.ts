import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { catchError } from 'rxjs/operators';
import { of, throwError, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';


@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private fireService: FirestoreService,
  ) { }

  sendStatus() {
    return this.http.get(`/status`)
  }
  
  /**
   * Send analytics event to Google Analytics and backend for aggregation
   */
  trackEvent(eventType: string, metadata: any = {}, token?: string, userId?: string, guestId?: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return of(null)
    }

    // Google Analytics logEvent
    this.fireService.logEvent(eventType, metadata)
    // Send event to backend
    const event = {
      eventType,
      metadata,
      userId,
      guestId
    }
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
    return this.http.post('/event/analytics/event', event, { headers }).pipe(
      // Gracefully handle 404 and other errors
      // You may need to import catchError, of, throwError from rxjs
      catchError(handleError)
    );
  }

  /**
   * Batch send analytics events to backend (for debounced/batched writes)
   */
  batchTrackEvents(events: any[], token?: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return of(null)
    }

    // Optionally batch logEvent to Google Analytics (not supported natively, so log individually)
    events.forEach(ev => {
      this.fireService.logEvent(ev.method || ev.eventType, ev)
    });
    // Send batch to backend
    const headers = new HttpHeaders({ 'Accept': 'application/json' });
    if (token) headers.append('Authorization', `Bearer ${token}`);
    return this.http.post('/event/analytics/batch', { events }, { headers }).pipe(
      catchError(handleError))
  }
}

function handleError(error: any): Observable<any> {
        if (error.status === 404) {
          console.warn('Analytics backend endpoint not found:', error);
          return of(null);
        }
        console.error('Analytics backend error:', error);
        return throwError(() => error);
      }
