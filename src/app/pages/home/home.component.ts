import { Component, OnInit, HostListener, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, NgClass } from '@angular/common';
import { themeStorageKey, ThemeToggleComponent, AnimatedBgComponent, LangPickerComponent } from 'src/app/shared';
import { FeaturesComponent, HeroComponent } from 'src/app/layout/landpage';
import { LocalStorage, ThemeService, WindowToken } from 'src/app/core/services';
import { AppFooterComponent } from 'src/app/layout/footer';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    ThemeToggleComponent,
    HeroComponent,
    FeaturesComponent,
    AppFooterComponent,
    NgClass,
    AsyncPipe,
    AnimatedBgComponent,
    LangPickerComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private localStorage = inject(LocalStorage);
  private themePicker = inject(ThemeService);
  private window: Window = inject(WindowToken);
  isDarkMode$: Observable<boolean> = this.themePicker.isDarkMode$;
  isScrolled = false;
  footerColor: string = '';
  // Removed 'lang' property as I18nService does not have it.

  constructor() {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = this.window.scrollY > 100;
  }

  isThemeDark(): boolean {
    return this.localStorage?.getItem(themeStorageKey) === 'true';
  }

  ngOnInit() {
    this.footerColor = 'landpage';
  }
}
