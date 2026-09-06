import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaymentComponent } from 'src/app/core/components';

@Component({
  selector: 'app-payment-tab',
  imports: [PaymentComponent],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTabComponent {

}
