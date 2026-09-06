import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaymentComponent } from 'src/app/core/components';

@Component({
    selector: 'app-setupintent',
    imports: [PaymentComponent],
    templateUrl: './setupintent.component.html',
    styleUrl: './setupintent.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupIntentComponent {

}
