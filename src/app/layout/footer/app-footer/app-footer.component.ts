import { Component, inject, Input } from '@angular/core';
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

    @Input() color = 'white';
    readonly icons = myIcons
    private localStorage = inject(LocalStorage)
    protected footer = {
        github: myIcons['github'],
        google: myIcons['google'],
        linkedin: myIcons['linkedin'],
        mail: myIcons['mail']
    }

    ngOnInit(): void {
        //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
        //Add 'implements OnInit' to the class.
        this.color = this.color? this.color : this.isThemeDark() ? 'dark:bg-[#1a1a25]' : 'white';
    }


    isThemeDark(): boolean {
        return this.localStorage.getItem(themeStorageKey) === 'dark';
      }
}
