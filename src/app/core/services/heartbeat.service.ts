import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, merge, fromEvent, timer, Subject } from 'rxjs';
import { takeUntil, switchMap, filter, startWith, tap } from 'rxjs/operators';
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

    start(intervalMs: number = 60000) {
        this.stop();
        this.isPaused = false;

        // User activity observable
        const activity$ = merge(
            fromEvent(this.window, 'mousemove'),
            fromEvent(this.window, 'keydown'),
            fromEvent(this.window, 'touchstart')
        );

        // Inactivity logic using RxJS
        this.inactivitySub = activity$.pipe(
            startWith(null),
            switchMap(() =>
                timer(this.inactivityMs).pipe(
                    tap(() => this.pause('inactivity'))
                )
            ),
            takeUntil(this.stop$)
        ).subscribe();

        // Heartbeat interval
        this.intervalSub = interval(intervalMs).pipe(
            filter(() => !this.isPaused && navigator.onLine),
            takeUntil(this.stop$)
        ).subscribe(() => {
            this.http.post('/api/heartbeat', {}).subscribe();
        });
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
