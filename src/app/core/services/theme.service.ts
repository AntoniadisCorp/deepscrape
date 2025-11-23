import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { themeStorageKey } from 'src/app/shared';
import { LocalStorage } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private localStorage = inject(LocalStorage);
    private themeSubject: BehaviorSubject<boolean>;

    constructor() {
        // Initialize from localStorage or default to false (light mode)
        const isDark = this.localStorage?.getItem(themeStorageKey) === 'true';
        this.themeSubject = new BehaviorSubject<boolean>(isDark);
    }

    get isDarkMode$(): Observable<boolean> {
        return this.themeSubject.asObservable();
    }

    get isDarkMode(): boolean {
        return this.themeSubject.value;
    }

    setDarkMode(isDark: boolean) {
        this.themeSubject.next(isDark);
    }
}
