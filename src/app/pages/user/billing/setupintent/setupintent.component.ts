import { Component } from '@angular/core';
import { PaymentComponent } from 'src/app/core/components';

@Component({
  selector: 'app-setupintent',
  standalone: true,
  imports: [PaymentComponent],
  templateUrl: './setupintent.component.html',
  styleUrl: './setupintent.component.scss'
})
export class SetupIntentComponent {

}
