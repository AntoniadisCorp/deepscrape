import { AsyncPipe, CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common'
import { Component } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { combineLatest, map, Observable } from 'rxjs'
import { BillingService } from 'src/app/core/services'
import { BillingPlanCatalog, BillingPlanTier, CreditPackCatalog, UserBilling } from 'src/app/core/types'

type PlanDetailVm = {
  selectedPlan: BillingPlanCatalog | null
  allPlans: BillingPlanCatalog[]
  creditPacks: CreditPackCatalog[]
  billing: UserBilling
  isCurrentPlan: boolean
}

@Component({
  selector: 'app-plan-details',
  imports: [NgIf, NgFor, NgClass, AsyncPipe, CurrencyPipe, RouterLink],
  templateUrl: './plan-details.component.html',
  styleUrl: './plan-details.component.scss'
})
export class PlanDetailsComponent {
  readonly vm$: Observable<PlanDetailVm>

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly billingService: BillingService,
  ) {
    const planId$ = this.route.paramMap.pipe(
      map((params) => (params.get('planId') || '').toLowerCase() as BillingPlanTier)
    )

    this.vm$ = combineLatest([this.billingService.catalog$, this.billingService.billing$, planId$]).pipe(
      map(([catalog, billing, planId]) => {
        const selectedPlan = catalog.plans.find((plan) => plan.id === planId) || null
        if (!selectedPlan) {
          void this.router.navigate(['/billing/plans'])
        }

        return {
          selectedPlan,
          allPlans: catalog.plans,
          creditPacks: catalog.creditPacks,
          billing,
          isCurrentPlan: selectedPlan?.id === billing.plan,
        }
      })
    )
  }

  readonly intervals: Array<{ key: 'payAsYouGo' | 'monthly' | 'quarterly' | 'annually'; label: string }> = [
    { key: 'payAsYouGo', label: 'Pay as you go' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'quarterly', label: 'Quarterly' },
    { key: 'annually', label: 'Annually' },
  ]

  goToPlan(planId: BillingPlanTier): void {
    void this.router.navigate(['/billing/plans', planId])
  }
}
