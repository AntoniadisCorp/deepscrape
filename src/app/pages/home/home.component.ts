import { Component, OnInit, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, CommonModule, NgClass, NgIf } from '@angular/common';
import { themeStorageKey, ThemeToggleComponent, AnimatedBgComponent } from 'src/app/shared';
import { MatIcon } from '@angular/material/icon';
import { FeaturesComponent, HeroComponent } from 'src/app/layout/landpage';
import { LocalStorage, ThemeService } from 'src/app/core/services';
import { AppFooterComponent } from 'src/app/layout/footer';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ThemeToggleComponent, HeroComponent, FeaturesComponent, AppFooterComponent, NgClass,
    AsyncPipe, AnimatedBgComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  private localStorage = inject(LocalStorage);
  private themePicker = inject(ThemeService)
  isDarkMode$: Observable<boolean> = this.themePicker.isDarkMode$; 
  isScrolled = false;
  footerColor: string = '';

  constructor() {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 100;
  }

  isThemeDark(): boolean {
    return this.localStorage?.getItem(themeStorageKey) === 'true';
  }

  ngOnInit() {
    this.footerColor = 'landpage';
  }
}
