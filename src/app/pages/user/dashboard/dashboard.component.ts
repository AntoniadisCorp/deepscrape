import { Component, HostBinding, inject } from '@angular/core';
import { AiAPIService, CrawlAPIService, LocalStorage } from 'src/app/core/services';

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
  constructor(private crawlservice: CrawlAPIService) {

    this.localStorage = inject(LocalStorage)
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

  }
  // Handle consent decision

  fetchData() {
    this.crawlservice.getfromCrawl4Ai().subscribe({
      error: (error) => {
        console.log(error)
      },
      next: (data) => {
        console.log(data)
      },
      complete: () => {
        console.log('complete')
      }
    })
  }
}
