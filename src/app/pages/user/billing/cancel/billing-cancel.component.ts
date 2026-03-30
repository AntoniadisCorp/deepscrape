import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NgIf } from '@angular/common'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'

@Component({
  selector: 'app-billing-cancel',
  imports: [RouterLink, NgIf],
  templateUrl: './billing-cancel.component.html',
  styleUrl: './billing-cancel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingCancelComponent {
  shouldShowCancelPage = false

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
          offerMessage: 'oh are you not satisfied with the offer, ask for new offer',
        },
      })
    }
  }
}
