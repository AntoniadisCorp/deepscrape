import { Component, HostListener, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgFor } from '@angular/common';
import { WindowToken } from 'src/app/core/services';

import { trigger, state, style, animate, transition } from '@angular/animations';
@Component({
    selector: 'app-landpage',
  imports: [NgFor],
    templateUrl: './landpage.component.html',
    styleUrl: './landpage.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('fadeInOut', [
            state('void', style({
                opacity: 0,
                transform: 'translateY(20px)'
            })),
            transition('void <=> *', [
                animate('0.5s ease-in-out')
            ])
        ])
    ]
})
export class LandPageComponent {
  private window: Window = inject(WindowToken);

  isVisible = false;
  selectedPlan: 'monthly' | 'yearly' = 'monthly';

  plans = {
    monthly: [
      {
        name: 'Starter',
        price: '29',
        features: ['5,000 pages/month', 'Basic API access', 'JSON export', 'Email support']
      },
      {
        name: 'Professional',
        price: '99',
        features: ['50,000 pages/month', 'Advanced API access', 'All export formats', 'Priority support', 'Custom selectors']
      },
      {
        name: 'Enterprise',
        price: '299',
        features: ['Unlimited pages', 'Full API access', 'Custom solutions', '24/7 support', 'Dedicated server']
      }
    ],
    yearly: [
      {
        name: 'Starter',
        price: '24',
        features: ['5,000 pages/month', 'Basic API access', 'JSON export', 'Email support']
      },
      {
        name: 'Professional',
        price: '84',
        features: ['50,000 pages/month', 'Advanced API access', 'All export formats', 'Priority support', 'Custom selectors']
      },
      {
        name: 'Enterprise',
        price: '254',
        features: ['Unlimited pages', 'Full API access', 'Custom solutions', '24/7 support', 'Dedicated server']
      }
    ]
  };

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = this.window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isVisible = scrollPosition > 100;
  }

  scrollToTop() {
    this.window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  togglePlan() {
    this.selectedPlan = this.selectedPlan === 'monthly' ? 'yearly' : 'monthly';
  }
}