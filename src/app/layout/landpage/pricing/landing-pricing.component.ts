import { Component, ChangeDetectionStrategy, OnInit, DestroyRef, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { RadioToggleComponent } from 'src/app/core/components';
import { myIcons, RevealDirective } from 'src/app/shared';

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
  imports: [RouterLink, LucideAngularModule, NgClass, ReactiveFormsModule, RadioToggleComponent, TranslateModule, RevealDirective],
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
      name: 'PRICING.NAME_FREE',
      priceMonthly: '0',
      priceYearly: '0',
      description: 'PRICING.DESC_FREE',
      features: [
        'PRICING.F_FREE_1',
        'PRICING.F_FREE_2',
        'PRICING.F_FREE_3',
        'PRICING.F_FREE_4',
        'PRICING.F_FREE_5',
      ],
      highlighted: false,
      cta: 'PRICING.CTA_FREE',
      ctaLink: '/service/signup',
    },
    {
      tier: 'starter',
      name: 'PRICING.NAME_STARTER',
      priceMonthly: '29',
      priceYearly: '24',
      description: 'PRICING.DESC_STARTER',
      features: [
        'PRICING.F_STARTER_1',
        'PRICING.F_STARTER_2',
        'PRICING.F_STARTER_3',
        'PRICING.F_STARTER_4',
        'PRICING.F_STARTER_5',
        'PRICING.F_STARTER_6',
      ],
      highlighted: false,
      cta: 'PRICING.CTA_TRIAL',
      ctaLink: '/service/signup',
    },
    {
      tier: 'pro',
      name: 'PRICING.NAME_PRO',
      priceMonthly: '99',
      priceYearly: '84',
      description: 'PRICING.DESC_PRO',
      features: [
        'PRICING.F_PRO_1',
        'PRICING.F_PRO_2',
        'PRICING.F_PRO_3',
        'PRICING.F_PRO_4',
        'PRICING.F_PRO_5',
        'PRICING.F_PRO_6',
        'PRICING.F_PRO_7',
      ],
      highlighted: true,
      cta: 'PRICING.CTA_TRIAL',
      ctaLink: '/service/signup',
    },
    {
      tier: 'enterprise',
      name: 'PRICING.NAME_ENT',
      priceMonthly: 'Custom',
      priceYearly: 'Custom',
      description: 'PRICING.DESC_ENT',
      features: [
        'PRICING.F_ENT_1',
        'PRICING.F_ENT_2',
        'PRICING.F_ENT_3',
        'PRICING.F_ENT_4',
        'PRICING.F_ENT_5',
        'PRICING.F_ENT_6',
        'PRICING.F_ENT_7',
        'PRICING.F_ENT_8',
      ],
      highlighted: false,
      cta: 'PRICING.CTA_SALES',
      ctaLink: '/contact',
    },
  ];
}
