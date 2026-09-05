import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { interval, Subscription, merge, fromEvent, timer, Subject, throwError, Observable, of } from 'rxjs';
import { takeUntil, switchMap, filter, startWith, tap, catchError } from 'rxjs/operators';
import { WindowToken } from './window.service';
import { GuestTrackingService } from './guest-tracking.service';

@Injectable({ providedIn: 'root' })
export class HeartbeatService {

    private window = inject(WindowToken);
    private guestTrackingService = inject(GuestTrackingService, { optional: true });
    private intervalSub: Subscription | null = null;
    private inactivitySub: Subscription | null = null;
    private isPaused = false;
    private readonly inactivityMs = 5 * 60 * 1000; // 5 minutes
    private stop$ = new Subject<void>();
    private sessionRevokedSubject = new Subject<void>();
    sessionRevoked$ = this.sessionRevokedSubject.asObservable();

    constructor(private http: HttpClient) {
        // Listen for network changes
        this.window.addEventListener('offline', () => this.pause('offline'));
        this.window.addEventListener('online', () => this.resume('online'));
    }

    start(token?: string, intervalMs: number = 60000) {
        this.stop();
        this.isPaused = false;

        // Inactivity logic using RxJS
        this.inactivitySub = this.createActivityStream().pipe(
            tap(() => {
                if (this.isPaused) this.resume('activity');
            }),
            startWith(null),
            switchMap(() =>
                timer(this.inactivityMs).pipe(
                    tap(() => this.pause('inactivity'))
                )
            ),
            takeUntil(this.stop$)
        ).subscribe();

        const headers = this.buildHeaders(token);

        // Heartbeat interval
        this.intervalSub = interval(intervalMs).pipe(
            filter(() => !this.isPaused && navigator.onLine),
            takeUntil(this.stop$),
            switchMap(() => {
                // Heartbeat requires either a user or guest identifier from cookies/session context.
                // During device-verification gated sign-in, auth can be true before IDs are established.
                if (!this.hasTrackingIdentity()) {
                    return of({ success: false, skipped: true, reason: 'missing-id' });
                }

                return this.http.post('/event/heartbeat', {}, { headers }).pipe(
                    catchError((error) => this.handleHeartbeatError(error))
                );
            }),
        ).subscribe({
            next(result: any) {
                if (!result?.skipped) {
                    console.log('Heartbeat successful')
                }
            },
            error(err) {
                console.error('Heartbeat error:', err);
            },
        });
    }

    private createActivityStream(): Observable<Event | null> {
        return merge(
            fromEvent(this.window, 'mousemove', { passive: true }),
            fromEvent(this.window, 'keydown'),
            fromEvent(this.window, 'touchstart', { passive: true })
        ).pipe(startWith(null));
    }

    private buildHeaders(token?: string): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
    }

    private hasTrackingIdentity(): boolean {
        const state = this.guestTrackingService?.getSessionContext();
        return Boolean(state?.userId || state?.guestId);
    }

    private handleHeartbeatError(error: any) {
        if (error?.status === 401 && error?.error?.code === 'session_revoked') {
            this.sessionRevokedSubject.next();
            return throwError(() => error);
        }

        // Guest/user identifiers can be temporarily unavailable during gated sign-in flows
        // (e.g., device verification required). Treat this as a no-op rather than a hard error.
        if (error?.status === 400 && error?.error?.message === 'No guest or user ID found') {
            return of({ success: false, skipped: true, reason: 'missing-id' });
        }

        return throwError(() => error);
    }

    stop() {
        this.stop$.next();
        if (this.intervalSub) {
            this.intervalSub.unsubscribe();
            this.intervalSub = null;
        }
        if (this.inactivitySub) {
            this.inactivitySub.unsubscribe();
            this.inactivitySub = null;
        }
        this.isPaused = true;
    }

    private pause(reason: 'offline' | 'inactivity') {
        this.isPaused = true;
        // Optionally: notify app of pause reason
        // console.log(`Heartbeat paused due to ${reason}`);
    }

    private resume(reason: 'online' | 'activity') {
        if (!this.isPaused) return;
        this.isPaused = false;
        // Optionally: notify app of resume reason
        // console.log(`Heartbeat resumed due to ${reason}`);
    }
}
