import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaymentComponent } from 'src/app/core/components';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-payment-tab',
  imports: [PaymentComponent, TranslateModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTabComponent {

}
