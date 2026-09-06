import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { myIcons } from 'src/app/shared';

interface UseCase {
  icon: string;
  title: string;
  headline: string;
  description: string;
  gradient: string;
  features: string[];
  bgIcon: string;
}

@Component({
  selector: 'app-landing-use-cases',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  templateUrl: './landing-use-cases.component.html',
  styleUrl: './landing-use-cases.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingUseCasesComponent {
  readonly icons = myIcons;

  readonly useCaseImages = [
    'assets/images/landing/use-cases-ecommerce.svg',
    'assets/images/landing/use-cases-ai-training.svg',
    'assets/images/landing/use-cases-market-research.svg',
    'assets/images/landing/use-cases-seo.svg',
  ];

  // Color helpers per use-case index: [icon-text, check-border, label, accent-bar, glow-rgba]
  private readonly iconColorClasses = [
    'text-cyan-500',
    'text-violet-400',
    'text-emerald-500',
    'text-orange-500',
  ];
  private readonly labelColorClasses = [
    'text-cyan-600 dark:text-cyan-400',
    'text-violet-500 dark:text-violet-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-orange-500 dark:text-orange-400',
  ];
  readonly accentBarClasses = [
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-rose-500',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-rose-500',
  ];
  readonly borderGlowColors = [
    'rgba(6,182,212,0.35)',
    'rgba(139,92,246,0.35)',
    'rgba(16,185,129,0.35)',
    'rgba(249,115,22,0.35)',
  ];

  readonly useCases: UseCase[] = [
    {
      icon: 'shoppingbag',
      title: 'E-Commerce',
      headline: 'Track competitors. Monitor prices. Automate product research.',
      description:
        'Extract product listings, pricing, reviews, and inventory data from any e-commerce platform at scale. deepscrape handles pagination, infinite scroll, and anti-bot measures so you get clean data every time.',
      gradient: 'from-cyan-500 to-blue-600',
      features: [
        'Product catalog extraction with AI schema detection',
        'Price monitoring & price history tracking',
        'Review & rating aggregation across sites',
        'Inventory & stock availability alerts',
      ],
      bgIcon: 'store',
    },
    {
      icon: 'brain',
      title: 'AI Training Data',
      headline: 'Build better models with real-world, diverse training data.',
      description:
        'Feed your LLMs, RAG pipelines, and ML models with fresh, structured web data. deepscrape delivers clean markdown and JSON at production scale — no HTML parsing, no token waste.',
      gradient: 'from-violet-500 to-rose-500',
      features: [
        'Clean markdown output optimized for LLM ingestion',
        'Structured JSON extraction with LLM schema support',
        'Multi-format export: JSON, CSV, DataFrames',
        'Semantic search index for RAG pipelines',
      ],
      bgIcon: 'sparkles',
    },
    {
      icon: 'target',
      title: 'Market Research',
      headline: 'Gather intelligence. Analyze trends. Move faster.',
      description:
        'Monitor news sites, social platforms, and industry publications for competitive intelligence. With deep crawling and world-aware geolocation, see what the market sees — from any region.',
      gradient: 'from-emerald-500 to-teal-600',
      features: [
        'Multi-site content aggregation with deduplication',
        'Geolocation-aware crawling (40+ countries)',
        'Trend analysis with semantic search',
        'Scheduled recurring crawls with change detection',
      ],
      bgIcon: 'globe',
    },
    {
      icon: 'search',
      title: 'SEO & Content',
      headline: 'Crawl like Googlebot. Optimize with real data.',
      description:
        'Understand how search engines see your site and your competitors. deepscrape renders JavaScript, captures Core Web Vitals, and extracts metadata for comprehensive SEO audits at scale.',
      gradient: 'from-orange-500 to-rose-500',
      features: [
        'Full JavaScript rendering for SPA audits',
        'Core Web Vitals & performance metrics',
        'Sitemap & internal link structure analysis',
        'Bulk competitor content comparison',
      ],
      bgIcon: 'linechart',
    },
  ];

  iconColorClass(i: number): string {
    return this.iconColorClasses[i] ?? 'text-cyan-500';
  }

  labelColorClass(i: number): string {
    return this.labelColorClasses[i] ?? 'text-cyan-600 dark:text-cyan-400';
  }

  accentBarClass(i: number): string {
    return this.accentBarClasses[i] ?? 'from-cyan-500 to-blue-600';
  }

  borderGlowColor(i: number): string {
    return this.borderGlowColors[i] ?? 'rgba(6,182,212,0.35)';
  }
}
