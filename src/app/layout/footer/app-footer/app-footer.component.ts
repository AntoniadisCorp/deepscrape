import { Component, DestroyRef, inject, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { LocalStorage } from 'src/app/core/services';
import { myIcons, themeStorageKey } from 'src/app/shared';

@Component({
    selector: 'app-footer',
    imports: [LucideAngularModule],
    templateUrl: './app-footer.component.html',
    styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {

    @Input() color?: string = 'dark:bg-[#1a1a25]'
    readonly icons = myIcons
    private localStorage = inject(LocalStorage)
    protected footer = {
        github: myIcons['github'],
        linkedin: myIcons['linkedin'],
        mail: myIcons['mail']
    }

    constructor() {
        
    }

    ngOnInit(): void {
        //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
        //Add 'implements OnInit' to the class.
        if (!this.color) {
            this.color = this.isThemeDark() ? 'dark:bg-[#1a1a25]' : 'bg-[#f5f5f5]';
        }
    }


    private isThemeDark(): boolean {
        return this.localStorage?.getItem(themeStorageKey) === 'true'; // Initialize isThemeDark;
    }
}
