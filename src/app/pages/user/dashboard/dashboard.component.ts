import { Component, HostBinding, inject } from '@angular/core';
import { LocalStorage } from 'src/app/core/services';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  @HostBinding('class') classes = 'grow';
  private localStorage: Storage
  constructor() {

    this.localStorage = inject(LocalStorage)
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

  }
  // Handle consent decision

}
