import { AsyncPipe, DatePipe, JsonPipe, KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Outsideclick } from '../../directives';
import { MatIcon } from '@angular/material/icon';
import { PopupAnimation } from 'src/app/animations';
import { CartService, ToggleBtnService } from '../../services';
import { Observable, Subscription } from 'rxjs';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dropdown-cart',
  standalone: true,
  imports: [NgIf, Outsideclick, MatIcon, AsyncPipe, KeyValuePipe],
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

    this.cartItems$ = this.cartService.getCart()
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
      default:
        break
    }

    this.closeCartMenu(event)

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
