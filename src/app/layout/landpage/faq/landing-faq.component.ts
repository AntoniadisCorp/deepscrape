import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { myIcons } from 'src/app/shared';

interface FaqItem {
  question: string;
  answer: string;
  category: 'general' | 'comparison' | 'technical';
}

@Component({
  selector: 'app-landing-faq',
  standalone: true,
  imports: [LucideAngularModule, NgClass],
  templateUrl: './landing-faq.component.html',
  styleUrl: './landing-faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFaqComponent {
  readonly icons = myIcons;
  readonly openIndex = signal<number | null>(null);
  readonly activeCategory = signal<'general' | 'comparison' | 'technical'>('general');

  readonly categories = [
    { id: 'general' as const, label: 'General' },
    { id: 'comparison' as const, label: 'deepscrape vs Self-Host' },
    { id: 'technical' as const, label: 'Technical' },
  ];

  readonly faqs: FaqItem[] = [
    // General
    {
      question: 'Do I need to install anything to use deepscrape?',
      answer:
        'No. deepscrape is a fully managed cloud service. You can use our REST API from any language (Python, Node.js, Go, curl) without any local dependencies. If you want the CLI experience, you can install our lightweight client SDK, but the core crawling infrastructure runs entirely on our servers.',
      category: 'general',
    },
    {
      question: 'How many pages can I crawl per month?',
      answer:
        'Our Free plan includes 5,000 pages/month. Starter is 50,000 pages/month, Professional is 250,000 pages/month, and Enterprise has unlimited pages. A "page" is one successful URL extraction — regardless of page size or complexity.',
      category: 'general',
    },
    {
      question: 'What kind of websites can deepscrape handle?',
      answer:
        'Any public website. deepscrape handles static pages, SPAs (React, Vue, Angular), infinite scroll, JavaScript-heavy sites, login-protected content (with session management), and sites with aggressive anti-bot measures. Our browser pool runs real Chromium instances with advanced stealth profiles.',
      category: 'general',
    },
    // Comparison
    {
      question: 'Why use deepscrape instead of self-hosting a scraper?',
      answer:
        'Managing your own scraping stack in production requires significant DevOps work: provisioning browser instances, handling memory pressure, managing proxy rotation, dealing with anti-detection, scaling horizontally under load, and monitoring uptime. deepscrape handles all of this automatically. For teams that want to focus on data, not infrastructure, deepscrape delivers 10x faster time-to-value.',
      category: 'comparison',
    },
    {
      question: 'How does pricing compare to self-hosting?',
      answer:
        'Self-hosting a scraping platform at scale means paying for cloud VMs (€50-500+/month for multi-browser setups), proxy services (€30-200+/month for rotating residential proxies), and engineering time to maintain the infrastructure. deepscrape starts at €0 and scales to €99/month for 250k pages — including proxies, anti-detection, and infrastructure. Most teams save 60-80% with deepscrape when you factor in engineering costs.',
      category: 'comparison',
    },
    {
      question: 'How does deepscrape compare to ScrapingBee, ScrapingFish, or BrightData?',
      answer:
        'deepscrape gives you AI-powered extraction, deep crawling with graph algorithms, anti-detection browser pools, and world-aware geolocation in one API — features that competitors charge premium tiers for. Everything is priced on a simple per-page model with a generous free tier.',
      category: 'comparison',
    },
    // Technical
    {
      question: 'What extraction formats does deepscrape support?',
      answer:
        'deepscrape returns structured data in JSON, CSV, and pandas DataFrame formats. We also provide clean Markdown output optimized for LLM ingestion, raw HTML when needed, and structured extraction via CSS selectors, XPath, or LLM-based schema extraction. You can also get screenshots, PDFs, and MHTML snapshots.',
      category: 'technical',
    },
    {
      question: 'Can I crawl pages that require login?',
      answer:
        'Yes. deepscrape supports session management with persistent browser profiles. You can provide cookies, session tokens, or authentication headers, and our browser pool will maintain the session across requests. Enterprise plans include dedicated browser profiles with saved authentication states.',
      category: 'technical',
    },
    {
      question: 'Is deepscrape GDPR and SOC2 compliant?',
      answer:
        'deepscrape is designed with enterprise compliance in mind. Data is encrypted at rest (Firestore/S3) and in transit (TLS 1.3). We offer data retention policies, automated data purging, and compliance reporting for Enterprise customers. SOC2 Type II certification is in progress for Q3 2026.',
      category: 'technical',
    },
  ];

  get filteredFaqs(): FaqItem[] {
    return this.faqs.filter(f => f.category === this.activeCategory());
  }

  toggleFaq(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }

  setCategory(cat: 'general' | 'comparison' | 'technical'): void {
    this.activeCategory.set(cat);
    this.openIndex.set(null);
  }
}
