import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { smoothfadeAnimation } from 'src/app/animations';

@Component({
    selector: 'app-billing',
    imports: [RouterOutlet],
    templateUrl: './billing.component.html',
    styleUrl: './billing.component.scss',
    animations: [smoothfadeAnimation],
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
export class BillingComponent {
  @HostBinding('class') classes = 'grow';

  getRouteAnimationData(outlet?: RouterOutlet | null): string {
    return outlet?.activatedRouteData?.['animation'] ?? 'billing-initial'
  }
}
