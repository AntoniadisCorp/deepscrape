import { Component, ChangeDetectionStrategy, OnInit, DestroyRef, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { RadioToggleComponent } from 'src/app/core/components';
import { myIcons } from 'src/app/shared';

interface PricingTier {
  tier: string;
  name: string;
  priceMonthly: string;
  priceYearly: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
  ctaLink: string;
}

@Component({
  selector: 'app-landing-pricing',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, NgClass, ReactiveFormsModule, RadioToggleComponent],
  templateUrl: './landing-pricing.component.html',
  styleUrl: './landing-pricing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPricingComponent implements OnInit {
  readonly icons = myIcons;
  readonly billingControl = new FormControl<boolean>(false, { nonNullable: true });
  isYearly = false;
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.billingControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(val => {
      this.isYearly = val;
    });
  }

  readonly tiers: PricingTier[] = [
    {
      tier: 'free',
      name: 'Free',
      priceMonthly: '0',
      priceYearly: '0',
      description: 'For exploring and small projects. No credit card needed.',
      features: [
        '5,000 pages / month',
        'REST API access',
        'JSON export',
        'Community support',
        'Basic anti-detection',
      ],
      highlighted: false,
      cta: 'Get Started',
      ctaLink: '/service/signup',
    },
    {
      tier: 'starter',
      name: 'Starter',
      priceMonthly: '29',
      priceYearly: '24',
      description: 'For growing teams that need more scale and power.',
      features: [
        '50,000 pages / month',
        'All export formats (CSV, JSON, DataFrame)',
        'Priority support',
        'Custom extraction rules',
        'Browser pool priority',
        'Advanced anti-detection profiles',
      ],
      highlighted: false,
      cta: 'Start Free Trial',
      ctaLink: '/service/signup',
    },
    {
      tier: 'pro',
      name: 'Professional',
      priceMonthly: '99',
      priceYearly: '84',
      description: 'For teams needing powerful extraction at scale.',
      features: [
        '250,000 pages / month',
        'LLM-powered extraction',
        'World-aware crawling',
        'Proxy rotation & geolocation',
        'Semantic search infrastructure',
        'Performance analytics dashboard',
        'Slack / Email alerts',
      ],
      highlighted: true,
      cta: 'Start Free Trial',
      ctaLink: '/service/signup',
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      priceMonthly: 'Custom',
      priceYearly: 'Custom',
      description: 'For organizations with demanding scraping requirements.',
      features: [
        'Unlimited pages',
        'Dedicated browser pool',
        'SLA guarantee',
        '24/7 dedicated support',
        'SSO & RBAC',
        'On-premise deployment option',
        'Custom integrations',
        'Compliance reporting',
      ],
      highlighted: false,
      cta: 'Contact Sales',
      ctaLink: '/service/contact',
    },
  ];
}
