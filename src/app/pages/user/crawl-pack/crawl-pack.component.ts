import { NgIf } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs/internal/Subscription';
import { AppTabsComponent } from 'src/app/core/components';
import { LinkTabs } from 'src/app/core/types';

@Component({
  selector: 'app-crawl-pack',
  standalone: true,
  imports: [RouterOutlet, AppTabsComponent],
  templateUrl: './crawl-pack.component.html',
  styleUrl: './crawl-pack.component.scss'
})
export class CrawlPackComponent {

  @HostBinding('class') classes = 'w-full';

  protected sourceTabUrl: string = 'crawlpack'
  protected tabs: LinkTabs[] = []

  private routerEventSubscription: Subscription
  constructor(private route: ActivatedRoute, private router: Router
  ) {
    this.routerEventSubscription = this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationStart) {
        // this.isLoading = true;
      } else if (event instanceof NavigationEnd) {

        this.onRouterChangeSetTabs()
      }
    })
  }
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    // ['crawlpack', 'machines', 'browserconfig', 'crawlerconfig', 'crawlresults', 'extraction']

    const newTabs: LinkTabs[] = [
      { label: 'Crawler Pack', active: false, icon: 'inventory_2', link: '', index: 'crawlpack' },
      { label: 'Machines', active: false, icon: 'memory', link: 'machines', index: 'machines' },
      { label: 'Browser Configuration', icon: 'travel_explore', active: false, link: 'browser', index: 'browserconfig' },
      { label: 'Crawler Configuration', icon: 'tune', active: false, link: 'configuration', index: 'crawlerconfig' },
      { label: 'Crawler Results', icon: 'data_object', active: false, link: 'results', index: 'crawlresults' },
      { label: 'Extraction Strategies', icon: 'output_circle', active: false, link: 'extraction', index: 'crawlextraction' },
    ]

    // push the new tabs
    this.tabs.push(...newTabs)


    this.onRouterChangeSetTabs()

  }

  private onRouterChangeSetTabs() {

    this.route.paramMap.subscribe(params => {
      const urlPath = this.router.url
      const urlWithoutHash = urlPath.split('#')[0]
      const pathParts = urlWithoutHash.split('/')
      const lastPathPart = pathParts[pathParts.length - 1]

      this.tabs.forEach(tab => {
        if (tab.link === lastPathPart || (lastPathPart === 'crawlpack' && tab.link === '')) {
          tab.active = true
        } else {
          tab.active = false
        }
      })
    })
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.routerEventSubscription?.unsubscribe()
  }
}
