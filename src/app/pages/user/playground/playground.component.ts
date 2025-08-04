import { Component, HostBinding, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { AppCrawlComponent, AppLLMScrapeComponent, PaymentComponent } from 'src/app/core/components';
import { LocalStorage } from 'src/app/core/services';
import { fadeinCartItems } from 'src/app/animations';

@Component({
  selector: 'app-playground',
  imports: [AppLLMScrapeComponent, AppCrawlComponent, CommonModule, RouterModule, NgClass, NgIf /* PaymentComponent */],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss',
  animations: [
    fadeinCartItems
  ]
})
export class PlaygroundComponent implements OnInit {
  @HostBinding('class') classes = 'grow';
  currentMode: 'llm-scrape' | 'crawl' = 'llm-scrape'; // Default mode

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.currentMode = params['mode'] === 'crawl' ? 'crawl' : 'llm-scrape';
    });
  }

  changeMode(mode: 'llm-scrape' | 'crawl'): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: mode },
      queryParamsHandling: 'merge'
    });
  }
}
