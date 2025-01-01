import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, WritableSignal, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { AppTheme } from 'src/app/core/enum';
import { LocalStorage, WindowToken } from 'src/app/core/services';

export const storageKey = 'app-theme-dark';

@Component({
    selector: 'app-theme-toggle',
    template: `
    <div (click)="toggleTheme()" class="flex flex-col items-center cursor-pointer justify-center dark:text-gray-100 border-none text-center bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
    <button mat-icon-button type="button" class="w-7 h-7 block xl:w-6 xl:h-6" 
            [title]="getToggleLabel()" [attr.aria-label]="getToggleLabel()">
      <mat-icon>
        {{  isDark ? 'light' : 'dark'  }}_mode
      </mat-icon>

    </button>
    </div>
  `,
    imports: [MatIcon],
    standalone: true
})
export class ThemeToggleComponent {
    isDark = false;
    system = false;
    private storedPreference: AppTheme | undefined = undefined;
    private window = inject(WindowToken)

    private currentTheme: WritableSignal<AppTheme | undefined>

    constructor(@Inject(DOCUMENT) private document: Document,
        @Inject(LocalStorage) private storage: Storage,
        @Inject(PLATFORM_ID) private platformId: object) {
        this.initializeThemeFromPreferences();
    }

    toggleTheme(): void {
        this.isDark = !this.isDark;
        this.updateRenderedTheme()
    }

    setDefaultTheme(): void {
        this.updateRenderedTheme()
    }

    private initializeThemeFromPreferences(): void {

        // Check whether there's an explicit preference in localStorage.
        this.storedPreference = this.storage ? this.storage?.getItem(storageKey) as AppTheme || undefined : undefined

        this.currentTheme = signal<AppTheme | undefined>(this.storedPreference)


        // If we do have a preference in localStorage, use that. Otherwise,
        // initialize based on the prefers-color-scheme media query.
        if (this.storedPreference) {
            this.isDark = this.storedPreference === 'true';
        } else {
            this.isDark = this.isSystemDark()
        }

        this.updateRenderedTheme()


        /*  const initialTheme = this.document.querySelector('#ai-initial-theme');
         if (initialTheme) {
             // TODO: change to initialTheme.remove() when ie support is dropped
             initialTheme.parentElement?.removeChild(initialTheme);
         }
  */
        /* const themeLink = this.document.createElement('link')
        themeLink.id = 'ai-custom-theme';
        themeLink.rel = 'stylesheet';
        themeLink.href = `${this.getThemeName()}-theme.css`;
        this.document.head.appendChild(themeLink); */


    }

    getThemeName(): string {
        return this.isDark ? 'dark' : 'light';
    }

    getToggleLabel(): string {
        return `Switch to ${this.system ? 'system' : this.isDark ? 'light' : 'dark'} mode`;
    }

    private updateRenderedTheme(): void {
        // If we're calling this method, the user has explicitly interacted with the theme toggle.
        /* const customLinkElement = this.document.getElementById('ai-custom-theme') as HTMLLinkElement | null;
        if (customLinkElement) {
            customLinkElement.href = `${this.getThemeName()}-theme.css`;
        } */

        /* if (this.isSystemDark()) {
            this.setSystemTheme()
        } */
        if (this.isDark) {
            this.setDarkTheme()
        } else {
            this.setLightTheme()
        }

        // this.setToLocalStorage(String(this.isDark) as AppTheme)

    }

    setLightTheme() {

        this.currentTheme.set(AppTheme.LIGHT);
        this.setToLocalStorage(AppTheme.LIGHT);
        this.removeClassFromHtml('dark');
    }
    setDarkTheme() {
        this.currentTheme.set(AppTheme.DARK);
        this.setToLocalStorage(AppTheme.DARK);
        this.addClassToHtml('dark')
    }
    setSystemTheme() {
        this.currentTheme.set(AppTheme.SYSTEM)
        this.removeFromLocalStorage()

        if (this.isSystemDark()) {
            this.addClassToHtml('dark')
        } else {
            this.removeClassFromHtml('dark')
        }
    }

    isSystemDark() {
        return isPlatformBrowser(this.platformId) ? this.window.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false : false
    }

    private addClassToHtml(className: string) {

        this.removeClassFromHtml(className);
        this.document.documentElement.classList.add(className)

    }
    private removeClassFromHtml(className: string) {

        this.document.documentElement.classList.remove(className)

    }
    private setToLocalStorage(theme: AppTheme) {

        this.storage?.setItem(storageKey, theme);

    }
    private removeFromLocalStorage() {

        this.storage?.removeItem(storageKey);

    }
}
