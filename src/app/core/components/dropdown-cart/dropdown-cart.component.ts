import { AsyncPipe, DatePipe, JsonPipe, KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Outsideclick } from '../../directives';
import { MatIcon } from '@angular/material/icon';
import { PopupAnimation } from 'src/app/animations';
import { CartService, ToggleBtnService } from '../../services';
import { catchError, map, Observable, of, shareReplay, Subscription, tap } from 'rxjs';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { Router } from '@angular/router';
import { ReversePipe } from '../../pipes';

@Component({
  selector: 'app-dropdown-cart',
  standalone: true,
  imports: [NgIf, Outsideclick, MatIcon, AsyncPipe, KeyValuePipe, ReversePipe],
  templateUrl: './dropdown-cart.component.html',
  styleUrl: './dropdown-cart.component.scss',
  animations: [PopupAnimation]
})
export class DropdownCartComponent {


  @Input() showCartMenu: boolean = false

  date: string = ''
  packagesLoading: boolean = false
  cartItems$: Observable<{ [key: string]: any }>

  private cartService = inject(CartService)
  private btnService = inject(ToggleBtnService)

  private btnSubs: Subscription


  constructor(private router: Router) {

    this.cartItems$ = this.cartService.getCart()/* .pipe(
      // FIXME: this.cartItems$ is not working properly
      map((items: { [key: string]: any }) => Object.entries(items).map(([key, value]) => ({ key, value }))),
      map(items => items.sort((a, b) => {
        if (a.key === 'uid') return -1
        // Sort by created_At field in descending order
        const dateA = new Date(a.value.created_At)
        const dateB = new Date(b.value.created_At)

        return dateB.getTime() - dateA.getTime()
      })),
      map(items => {
        const result: any = {};
        // console.log(items.reverse())
        for (const { key, value } of items) {
          result[key] = value
          console.log(key)
        }
        return result;
      }),
      catchError(error => {
        console.error(error);
        return of([]); // or some other default value
      })
    ) */
  }

  ngOnInit() {
    this.btnSubs = this.btnService.menuOpen$.subscribe((open) => {
      this.showCartMenu = open
    })
  }


  protected closeCartMenu(event: any) {
    // if user press profile button
    // Delay click detection to allow button click event to process first
    setTimeout(() => {

      // on outside click
      this.btnService.closeMenu()
    }, 100)
  }

  protected openLinkMenu(event: Event, key: string) {
    console.log(key)
    switch (key) {
      case 'browserProfile':
        this.router.navigate(['/crawlpack/browser'], { fragment: 'controlling-each-browser' })
        break
      case 'crawlConfig':
        this.router.navigate(['/crawlpack/configuration'], { fragment: 'controlling-each-crawl' })
        break
      default:
        break
    }

    this.closeCartMenu(event)

  }

  switchIcon(key: string) {
    switch (key) {
      case 'browserProfile':
        return 'playwright'
      case 'crawlConfig':
        return 'spider-crawl-config'
      default:
        return 'crawl_logo'
    }
  }


  protected parseCartItemDate(pastDate: number) {
    return formatDistanceToNow(new Date(pastDate), { addSuffix: true })
  }
  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.btnSubs?.unsubscribe()
  }
}
