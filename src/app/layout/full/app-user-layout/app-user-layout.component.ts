import { AsyncPipe, isPlatformBrowser, NgClass, NgIf, NgOptimizedImage } from '@angular/common'
import { ChangeDetectionStrategy, Component, HostBinding, inject, Inject, PLATFORM_ID } from '@angular/core'
import { Auth, signOut, User } from '@angular/fire/auth'
import { doc, Firestore, getDoc } from '@angular/fire/firestore'
import { MatIcon } from '@angular/material/icon'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { ChildrenOutletContexts, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router'
import { catchError, delay, finalize, from, map, switchMap, throwError, timer } from 'rxjs'
import { Observable } from 'rxjs/internal/Observable'
import { of } from 'rxjs/internal/observable/of'
import { take } from 'rxjs/internal/operators/take'
import { Subscription } from 'rxjs/internal/Subscription'
import { asideBarAnimation, fadeInOutSlideAnimation, PopupAnimation } from 'src/app/animations'
import { ImageSrcsetDirective, Outsideclick, RippleDirective } from 'src/app/core/directives'
import { ProviderPipe } from 'src/app/core/pipes'
import { CartService, FirestoreService, ScreenResizeService } from 'src/app/core/services'
import { Users } from 'src/app/core/types'
import { ThemeToggleComponent } from 'src/app/shared'
import { AppSidebarComponent } from '../../components'
import { AppFooterComponent } from '../../footer'
import { SCREEN_SIZE } from 'src/app/core/enum'
import { CartPackNotifyComponent, DropdownCartComponent } from 'src/app/core/components'

@Component({
  selector: 'app-user-layout',
  imports: [NgClass, RouterOutlet, RouterLink, ThemeToggleComponent, AsyncPipe, MatIcon, NgIf,
    MatProgressSpinner, ImageSrcsetDirective, ProviderPipe, Outsideclick, AppSidebarComponent,
    AppFooterComponent, RippleDirective, CartPackNotifyComponent, DropdownCartComponent],
  animations: [fadeInOutSlideAnimation, PopupAnimation, asideBarAnimation],
  templateUrl: './app-user-layout.component.html',
  styleUrl: './app-user-layout.component.scss'
})
export class AppUserLayoutComponent {

  @HostBinding('class') classes = 'h-full w-full bg-gray-100 dark:bg-gray-900 min-h-svh'
  private firestoreService = inject(FirestoreService)
  size!: SCREEN_SIZE;

  sizeSub: Subscription;

  user$: Observable<Users | null>
  cartPackager$: Observable<any>

  // Toggle Button To Open and Close Profile Dropdown Menu
  showProfileMenu: boolean

  closeAsideBar!: boolean

  protected loginPath: string

  loading: boolean
  userLoading: boolean
  authorized: boolean
  logoutSubscription: Subscription
  userSubscription: Subscription
  private routerEventSubscription: Subscription
  protected compIsLoading = true;
  /* animations */
  viewSmallDevices: boolean

  constructor(

    @Inject(PLATFORM_ID) private platformId: object,
    private contexts: ChildrenOutletContexts,
    private resizeSvc: ScreenResizeService,
    private router: Router,
    private auth: Auth,
    private cartService: CartService,
  ) {

    this.routerEventSubscription = this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => { this.compIsLoading = false; }, 1000)
      }
    })

    this.closeAsideBar = false
    this.viewSmallDevices = false

    // Set the initial values
    this.authorized = this.loading = false

    this.showProfileMenu = false

    this.user$ = of(null)
    this.cartPackager$ = this.cartService.getCart()


  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    if (isPlatformBrowser(this.platformId))
      this.GetUserProfile()

    this.InitCloseSideBarOnSmallDevices()
  }



  private InitCloseSideBarOnSmallDevices() {
    const { screenWidth } = this.resizeSvc.updateScreenSize()

    // On startup, check the screen size, to close the e aside bar
    this.viewSmallDevices = this.closeAsideBar = screenWidth < 992

    this.sizeSub = this.resizeSvc.onResize$.subscribe(x => {

      this.size = x
      if (this.closeAsideBar != undefined)
        this.closeAsideBar = this.viewSmallDevices = this.size < SCREEN_SIZE.LG

    })
  }

  addAsideBar(value: boolean) {

    if (value === this.closeAsideBar) // The value was same as this component
      this.closeAsideBar = !value

    else this.closeAsideBar = value
  }

  onCloseAsideBar(event: boolean) {

    this.closeAsideBar = event
  }


  private GetUserProfile(username?: string) {

    // get the user id from Browser Memory

    // Create an Http request to get the user profile data
    this.userLoading = true
    this.user$ = of(this.auth.currentUser).pipe(
      take(1),
      switchMap(user => {
        if (user) {
          this.authorized = true
          this.userLoading = false

          return from(this.firestoreService.getUserData(user)).pipe(
            catchError((err) => {
              console.log(err)
              return throwError(() => err)
            }
            ))
        }
        else {
          this.authorized = false
          this.userLoading = false
          return of(null)
        }
      }),
      catchError(error => {
        console.log(error)
        this.userLoading = false
        return of(null)
      })
    )

  }

  openProfileMenu(event?: any): void {
    // if user press profile button
    if (event && (event.target.alt === "user photo"))
      this.showProfileMenu = true

    // on outside click
    else this.showProfileMenu = !this.showProfileMenu

  }

  closeProfileMenu(event: Event, username?: string) {
    this.showProfileMenu = false
    const target = event.target as HTMLElement
    let altAttribute = target.getAttribute('role')

    switch (altAttribute) {
      case 'dashboard':
        this.router.navigate(['/dashboard'])
        break
      case 'billing':
        this.router.navigate(['/billing'])
        break
      case 'settings':
        this.router.navigate([username ? username : '' + '/settings'])
        break
      case 'chatai':
        this.router.navigate(['/chatai'])
        break
      default:
        break

    }
  }


  logout() {
    this.loading = true
    this.logoutSubscription = from(signOut(this.auth)).pipe(
      delay(1000),
      finalize(() => {
        this.loading = false
        this.showProfileMenu = false
      })
    ).subscribe({
      next: () => {
        console.log('User logged out')
        timer(300).subscribe(() => {
          this.router.navigate(['/'])
        })
      },
      error: (error) => {
        console.error('Logout error:', error)
      },
      complete: () => {
      }
    })
  }

  getAnimationData(outlet: RouterOutlet) {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation']
    // return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation']
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.logoutSubscription?.unsubscribe()
    this.sizeSub?.unsubscribe()
    this.routerEventSubscription?.unsubscribe()
  }
}
