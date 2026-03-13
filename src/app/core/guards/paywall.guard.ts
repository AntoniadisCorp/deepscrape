import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { BillingService } from '../services'
import { map } from 'rxjs/operators'

export const paywallGuard: CanActivateFn = (_route, state) => {
  const billingService = inject(BillingService)
  const router = inject(Router)

  return billingService.canAccessPaidFeatures$().pipe(
    map((allowed) => {
      if (allowed) {
        return true
      }

      router.navigate(['/billing/plans'], {
        queryParams: {
          reason: 'upgrade_required',
          returnUrl: state.url,
        },
      })

      return false
    })
  )
}
