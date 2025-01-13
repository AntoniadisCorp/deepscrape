import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  loadingSubject$ = new BehaviorSubject<boolean>(false);

  isLoading(): Observable<boolean> {
    return this.loadingSubject$.asObservable().pipe(distinctUntilChanged());;
  }

  startLoading(): void {
    this.loadingSubject$.next(true);
  }

  stopLoading(): void {
    this.loadingSubject$.next(false);
  }

  startAndStopLoading(routine: () => boolean): void {
    const shouldStop = routine();
    if (shouldStop) {
      this.stopLoading();
    } else {
      setTimeout(() => {
        this.startAndStopLoading(routine);
      }, 1000); // delay for 1 second
    }
  }
}
