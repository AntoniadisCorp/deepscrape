import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss',
  // host: { class: 'grow' }

})
export class BillingComponent {
  @HostBinding('class') classes = 'grow';
}
