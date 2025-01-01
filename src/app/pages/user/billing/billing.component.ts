import { Component } from '@angular/core';
import { PaymentComponent } from 'src/app/core/components';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [PaymentComponent],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent {

}
