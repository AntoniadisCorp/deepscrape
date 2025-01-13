import { Component, HostBinding, inject } from '@angular/core';
import { AppScrapeComponent, PaymentComponent } from 'src/app/core/components';
import { LocalStorage } from 'src/app/core/services';

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [AppScrapeComponent, PaymentComponent],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss'
})
export class PlaygroundComponent {
  @HostBinding('class') classes = 'grow';
  private localStorage: Storage
  constructor() {

    this.localStorage = inject(LocalStorage)
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

  }
}
