import { Component, Input } from '@angular/core';

import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-operations-tab',
  standalone: true,
  imports: [],
  templateUrl: './operations-tab.component.html',
  styleUrl: './operations-tab.component.scss',
  animations: [
    trigger('collapseExpand', [
      state('collapsed', style({ height: '0px', overflow: 'hidden' })),
      state('expanded', style({ height: '*', overflow: 'hidden' })),
      transition('collapsed <=> expanded', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class OperationsTabComponent {
  @Input() title: string = 'Test Crawl Operation Queue';
  @Input() url: string = 'https://medium.com/@antkitasharma_16193/basic-differeces-between-angular-17-and-angular-fe1b4a09d879 ... +2 more';
  @Input() userName: string = 'Προκοπης Αντωνιαδης';
  @Input() status: string = 'Completed';
  @Input() date: string = 'February 23,2025 04:40 PM';
  @Input() dataSize: string = '34MB';
  @Input() progress: string = '40 %';
  @Input() time: string = '5,6 sec';

  isExpanded: boolean = false;

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }
}
