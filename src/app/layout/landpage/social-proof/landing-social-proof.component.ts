import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RevealDirective } from 'src/app/shared';

interface Testimonial {
  initials: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  stars: number;
  gradient: string;
}

@Component({
  selector: 'app-landing-social-proof',
  standalone: true,
  imports: [RouterLink, TranslateModule, RevealDirective],
  templateUrl: './landing-social-proof.component.html',
  styleUrl: './landing-social-proof.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingSocialProofComponent {
  readonly testimonials: Testimonial[] = [
    {
      initials: 'JD',
      name: 'Jamie Doe',
      role: 'CTO',
      company: 'DataVault Inc.',
      quote: 'SOCIAL.QUOTE_1',
      stars: 5,
      gradient: 'from-cyan-500 to-rose-500',
    },
    {
      initials: 'AK',
      name: 'Alex Kim',
      role: 'Lead Engineer',
      company: 'ScrapeOps',
      quote: 'SOCIAL.QUOTE_2',
      stars: 5,
      gradient: 'from-rose-500 to-cyan-500',
    },
    {
      initials: 'SR',
      name: 'Sarah Riviera',
      role: 'Head of Data',
      company: 'MarketIntel AI',
      quote: 'SOCIAL.QUOTE_3',
      stars: 5,
      gradient: 'from-violet-500 to-cyan-500',
    },
    {
      initials: 'MC',
      name: 'Marcus Chen',
      role: 'Founder',
      company: 'DataFlow Labs',
      quote: 'SOCIAL.QUOTE_4',
      stars: 5,
      gradient: 'from-emerald-500 to-cyan-500',
    },
  ];

  readonly companyLogos = [
    'DataVault',
    'ScrapeOps',
    'MarketIntel',
    'DataFlow Labs',
    'AICore',
    'WebPulse',
  ];
}
