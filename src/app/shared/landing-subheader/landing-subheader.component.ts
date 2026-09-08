import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleComponent } from '../theme-picker/theme-picker.component';
import { LangPickerComponent } from '../lang-picker/lang-picker.component';

interface SubNavItem {
  label: string;
  link: string;
}

/**
 * Lightweight landpage-style sticky header reused by static pages that are not
 * part of the main landpage scroll chrome (privacy, terms, 404).
 * Matches the DeepScrape wordmark + glass nav + theme/lang controls of the
 * platform header while staying dependency-light (no auth state).
 */
@Component({
  selector: 'app-landing-subheader',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent, LangPickerComponent],
  templateUrl: './landing-subheader.component.html',
  styleUrl: './landing-subheader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingSubheaderComponent {
  readonly items: SubNavItem[] = [
    { label: 'Home', link: '/' },
    { label: 'Privacy', link: '/privacy' },
    { label: 'Terms', link: '/terms' },
    { label: 'Contact', link: '/contact' },
  ];
}
