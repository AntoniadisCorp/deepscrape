import { Component, inject } from '@angular/core';
import { AppFooterComponent } from '../../footer'
// import { AppHeaderComponent } from '../../header';
import { RouterLink } from '@angular/router';
import { LocalStorage } from 'src/app/core/services';
import { themeStorageKey } from 'src/app/shared';

@Component({
    selector: 'app-not-found',
    imports: [RouterLink, AppFooterComponent],
    templateUrl: './app-not-found.component.html',
    styleUrl: './app-not-found.component.scss'
})
export class NotFoundComponent {

    private localStorage = inject(LocalStorage)
    footerColor: string = '';


    ngOnInit(): void {
        //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
        //Add 'implements OnInit' to the class.
        this.footerColor = this.isThemeDark() ? 'dark:bg-[#212121]' : 'bg-[#f5f5f5]';
    }


    isThemeDark(): boolean {
        return this.localStorage?.getItem(themeStorageKey) === 'true'; // Initialize isThemeDark
    }

}