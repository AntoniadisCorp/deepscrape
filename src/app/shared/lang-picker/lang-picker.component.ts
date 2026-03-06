import { Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RippleDirective } from 'src/app/core/directives';
import { I18nService } from 'src/app/core/i18n';

import { MatMenuModule, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';

@Component({
  selector: 'app-lang-picker',
  standalone: true,
  templateUrl: './lang-picker.component.html',
  imports: [MatIconModule, RippleDirective, MatMenuModule, MatMenuItem],
})
export class LangPickerComponent {
  private i18nService = inject(I18nService);
  color = input<{ dark: string, light: string } | undefined>()

  readonly currentLang = this.i18nService.currentLang;

  availableLangs = [
    { code: 'en', display: 'English' },
    { code: 'el', display: 'Ελληνικά' },
    // Add more languages as needed
  ];

  changeLanguage(langCode: string): void {
    this.i18nService.use(langCode);
  }

  openLanguageMenu(event: MouseEvent, trigger: MatMenuTrigger): void {
    event.stopPropagation();
    trigger.openMenu();
  }

  getIconColorClass(): string {
        const color = this.color();
        if (color) {
            return `--icon-color: ${color.dark}; --icon-color-dark: ${color.light}`;
        } else {
            return '--icon-color: rgb(63 81 181); --icon-color-dark: #ffffffbd; --icon-hover-color: rgb(63 81 181); --icon-hover-color-dark: #e1e4e7;';
        }
    }
}
