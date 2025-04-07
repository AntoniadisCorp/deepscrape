import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-billing',
    imports: [RouterOutlet],
    templateUrl: './billing.component.html',
    styleUrl: './billing.component.scss'
})
export class BillingComponent {
  @HostBinding('class') classes = 'grow';
}
