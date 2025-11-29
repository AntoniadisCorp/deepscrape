import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { interval, Subscription, merge, fromEvent, timer, Subject, of } from 'rxjs';
import { takeUntil, switchMap, filter, startWith, tap, map } from 'rxjs/operators';
import { WindowToken } from './window.service';

@Injectable({ providedIn: 'root' })
export class HeartbeatService {

    private window = inject(WindowToken);
    private intervalSub: Subscription | null = null;
    private inactivitySub: Subscription | null = null;
    private isPaused = false;
    private readonly inactivityMs = 5 * 60 * 1000; // 5 minutes
    private stop$ = new Subject<void>();

    constructor(private http: HttpClient) {
        // Listen for network changes
        this.window.addEventListener('offline', () => this.pause('offline'));
        this.window.addEventListener('online', () => this.resume('online'));
    }

    start(token?: string, intervalMs: number = 60000) {
        this.stop();
        this.isPaused = false;

        // User activity observable
        const activity$ = merge(
            fromEvent(this.window, 'mousemove', { passive: true }),
            fromEvent(this.window, 'keydown'),
            fromEvent(this.window, 'touchstart', { passive: true })
        );

        // Inactivity logic using RxJS
        this.inactivitySub = activity$.pipe(
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

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });

        // Heartbeat interval
        this.intervalSub = interval(intervalMs).pipe(
            filter(() => !this.isPaused && navigator.onLine),
            takeUntil(this.stop$),
            switchMap(() => this.http.post('/event/heartbeat', {}, { headers })),
        ).subscribe({
            next(value) {
                console.log('Heartbeat successful')
            },
            error(err) {
                console.error('Heartbeat error:', err);
            },
        });
        console.log('Heartbeat successful')
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
