import { inject, Injectable } from '@angular/core';
import { Observable, Subject, distinctUntilChanged } from 'rxjs';
import { SCREEN_SIZE } from 'src/app/core/enum';
import { WindowToken } from './window.service';

// resize.service.ts

@Injectable({
  providedIn: 'root'
})
export class ScreenResizeService {
  private window: Window = inject(WindowToken)
  get onResize$(): Observable<SCREEN_SIZE> {
    return this.resizeSubject.asObservable().pipe(distinctUntilChanged());
  }

  private resizeSubject: Subject<SCREEN_SIZE>;

  constructor() {
    this.resizeSubject = new Subject();
  }

  onResize(size: SCREEN_SIZE) {
    this.resizeSubject.next(size);
  }

  updateScreenSize() {
    return { screenWidth: this.window.innerWidth, screenHeight: this.window.innerHeight }
  }


}