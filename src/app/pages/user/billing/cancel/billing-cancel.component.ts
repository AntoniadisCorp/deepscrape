import { ChangeDetectionStrategy, Component, inject } from '@angular/core'

import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { TranslateModule, TranslateService } from '@ngx-translate/core'

@Component({
  selector: 'app-billing-cancel',
  imports: [RouterLink, TranslateModule],
  templateUrl: './billing-cancel.component.html',
  styleUrl: './billing-cancel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingCancelComponent {
  shouldShowCancelPage = false
  private readonly translate = inject(TranslateService)

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    const intent = this.route.snapshot.queryParamMap.get('intent')
    this.shouldShowCancelPage = intent === 'cancel-plan'

    if (!this.shouldShowCancelPage) {
      void this.router.navigate(['/billing/plans'], {
        queryParams: {
          offer: '1',
          offerMessage: this.translate.instant('BILLING_PLANS.OFFER_MESSAGE'),
        },
      })
    }
  }
}
