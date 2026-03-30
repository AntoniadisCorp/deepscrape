import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-transactions',
    imports: [],
    templateUrl: './transactions.component.html',
    styleUrl: './transactions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsComponent {

}
