import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RippleDirective } from 'src/app/core/directives';
import { PlanPeriod } from 'src/app/core/types';

@Component({
    selector: 'app-plans',
    imports: [NgIf, NgFor, RippleDirective, CurrencyPipe, MatIcon],
    templateUrl: './plans.component.html',
    styleUrl: './plans.component.scss'
})


export class PlansComponent {
  planView: PlanPeriod
  planPeriods: Array<PlanPeriod> = []

  currencyValue: string = "EUR"

  currentPlan: string = "basic_plan"

  currentPrice: PlanPeriod = { value: "monthly", label: "Monthly" }

  constructor() {

    this.planPeriods = [
      { value: "payAsYouGo", label: "Pay as you go" },
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
      { value: "annually", label: "Annually" }]


    if (!this.currentPrice.value || !this.currentPlan)
      this.planView = { value: "payAsYouGo", label: "Pay as you go" }
    else this.planView = this.currentPrice
  }

  switchPlanView(plan: PlanPeriod) {
    this.planView = plan
  }

}
