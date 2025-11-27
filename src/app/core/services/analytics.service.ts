import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Analytics, logEvent, AnalyticsInstances } from '@angular/fire/analytics';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  constructor(
    @Inject(AnalyticsInstances) private analytics: Analytics,
    private http: HttpClient, 
  ) { }

  sendStatus() {
    return this.http.get(`/status`)
  }
  
  /**
   * Send analytics event to Google Analytics and backend for aggregation
   */
  trackEvent(eventType: string, metadata: any = {}, token?: string, userId?: string, guestId?: string) {
    // Google Analytics logEvent
    logEvent(this.analytics, eventType, metadata)
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
    return this.http.post('/event/analytics/event', event, { headers })
  }

  /**
   * Batch send analytics events to backend (for debounced/batched writes)
   */
  batchTrackEvents(events: any[], token?: string) {
    // Optionally batch logEvent to Google Analytics (not supported natively, so log individually)
    events.forEach(ev => {
      logEvent(this.analytics, ev.method || ev.eventType, ev);
    });
    // Send batch to backend
    const headers = new HttpHeaders({ 'Accept': 'application/json' });
    if (token) headers.append('Authorization', `Bearer ${token}`);
    return this.http.post('/event/analytics/batch', { events }, { headers });
  }
}
