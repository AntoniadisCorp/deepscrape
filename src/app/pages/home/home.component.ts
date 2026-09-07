import { Component, OnInit, HostListener, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, NgClass } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { themeStorageKey, ThemeToggleComponent, AnimatedBgComponent, LangPickerComponent } from 'src/app/shared';
import { FeaturesComponent, HeroComponent, LandingArchitectureComponent, LandingCodeDemoComponent, LandingPricingComponent, LandingSocialProofComponent, LandingUseCasesComponent, LandingFaqComponent } from 'src/app/layout/landpage';
import { LocalStorage, ThemeService, WindowToken, ScrollService } from 'src/app/core/services';
import { AppFooterComponent } from 'src/app/layout/footer';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    ThemeToggleComponent,
    HeroComponent,
    FeaturesComponent,
    LandingArchitectureComponent,
    LandingCodeDemoComponent,
    LandingPricingComponent,
    LandingSocialProofComponent,
    LandingUseCasesComponent,
    LandingFaqComponent,
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
  private scrollService = inject(ScrollService);
  private document = inject(DOCUMENT);
  isDarkMode$: Observable<boolean> = this.themePicker.isDarkMode$;
  isScrolled = false;
  footerColor: string = '';
  // Removed 'lang' property as I18nService does not have it.

  readonly navLinks = [
    { id: 'features', label: 'Features' },
    { id: 'use-cases', label: 'Use Cases' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ];

  constructor() {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = this.window.scrollY > 100;
  }

  /** Scrolls to a section anchor on this page (smooth, header-offset aware). */
  scrollToSection(id: string) {
    const el = this.document.getElementById(id);
    if (el) this.scrollService.scrollToElementByOffset(el);
  }

  isThemeDark(): boolean {
    return this.localStorage?.getItem(themeStorageKey) === 'true';
  }

  ngOnInit() {
    this.footerColor = 'landpage';
  }
}
