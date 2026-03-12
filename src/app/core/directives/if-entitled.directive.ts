import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy } from '@angular/core'
import { BillingService } from '../services'
import { Subscription } from 'rxjs'

@Directive({
  selector: '[ifEntitled]',
  standalone: true,
})
export class IfEntitledDirective implements OnDestroy {
  private subscription?: Subscription

  @Input('ifEntitled')
  set feature(feature: string) {
    this.subscription?.unsubscribe()

    this.subscription = this.billingService.hasFeature$(feature).subscribe((allowed) => {
      this.viewContainer.clear()

      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef)
      }
    })
  }

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly billingService: BillingService
  ) {}

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }
}
