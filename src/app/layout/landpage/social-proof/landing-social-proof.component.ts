import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
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
      quote: 'deepscrape handles the complexity of distributed crawling so we can focus on building our product. The API is dead simple.',
      stars: 5,
      gradient: 'from-cyan-500 to-rose-500',
    },
    {
      initials: 'AK',
      name: 'Alex Kim',
      role: 'Lead Engineer',
      company: 'ScrapeOps',
      quote: 'We replaced our entire scraping stack with deepscrape. 10x faster, zero maintenance, and anti-detection that actually works in production.',
      stars: 5,
      gradient: 'from-rose-500 to-cyan-500',
    },
    {
      initials: 'SR',
      name: 'Sarah Riviera',
      role: 'Head of Data',
      company: 'MarketIntel AI',
      quote: 'We crawl 200k+ pages daily for competitive intelligence. deepscrape\'s memory-adaptive dispatcher handles the load without breaking a sweat. The self-hosted option sealed the deal for compliance.',
      stars: 5,
      gradient: 'from-violet-500 to-cyan-500',
    },
    {
      initials: 'MC',
      name: 'Marcus Chen',
      role: 'Founder',
      company: 'DataFlow Labs',
      quote: 'We started with an in-house scraper, then moved to deepscrape when we needed scale. Same results, zero infrastructure headaches. The best onboarding I\'ve experienced in a data product.',
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
