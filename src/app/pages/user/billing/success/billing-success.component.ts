import { NgIf } from '@angular/common'
import { Component } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { BillingService } from 'src/app/core/services'

@Component({
  selector: 'app-billing-success',
  imports: [RouterLink, NgIf],
  templateUrl: './billing-success.component.html',
  styleUrl: './billing-success.component.scss'
})
export class BillingSuccessComponent {
  readonly returnUrl: string | null
  isVerifiedSession = false

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly billingService: BillingService,
  ) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')

    const sessionId = this.route.snapshot.queryParamMap.get('session_id')
    if (!sessionId) {
      void this.router.navigate(['/billing/plans'])
      return
    }

    void this.billingService.verifyCheckoutSession(sessionId)
      .then((result) => {
        if (!result.valid) {
          void this.router.navigate(['/billing/plans'])
          return
        }

        this.isVerifiedSession = true
      })
      .catch(() => {
        void this.router.navigate(['/billing/plans'])
      })
  }
}
