import { AsyncPipe, isPlatformBrowser, NgIf, NgOptimizedImage } from '@angular/common'
import { Component, Inject, PLATFORM_ID } from '@angular/core'
import { Auth, signOut, User } from '@angular/fire/auth'
import { Firestore } from '@angular/fire/firestore'
import { MatIcon } from '@angular/material/icon'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { ChildrenOutletContexts, Router, RouterLink, RouterOutlet } from '@angular/router'
import { catchError, delay, finalize, from, map, switchMap, timer } from 'rxjs'
import { Observable } from 'rxjs/internal/Observable'
import { of } from 'rxjs/internal/observable/of'
import { take } from 'rxjs/internal/operators/take'
import { tap } from 'rxjs/internal/operators/tap'
import { Subscription } from 'rxjs/internal/Subscription'
import { fadeInOutSlideAnimation } from 'src/app/animations'
import { ImageSrcsetDirective } from 'src/app/core/directives'
import { getUserData } from 'src/app/core/functions'
import { ProviderPipe } from 'src/app/core/pipes'
import { FirestoreService } from 'src/app/core/services'
import { Users } from 'src/app/core/types'
import { ThemeToggleComponent } from 'src/app/shared'

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, ThemeToggleComponent, AsyncPipe, NgIf, MatProgressSpinner, ImageSrcsetDirective, ProviderPipe],
  animations: [fadeInOutSlideAnimation],
  templateUrl: './app-user-layout.component.html',
  styleUrl: './app-user-layout.component.scss'
})
export class AppUserLayoutComponent {
  user$: Observable<Users | null>

  // Toggle Button To Open and Close Profile Dropdown Menu
  showProfileMenu: boolean

  protected loginPath: string

  loading: boolean
  userLoading: boolean
  authorized: boolean
  logoutSubscription: Subscription
  userSubscription: Subscription

  constructor(

    @Inject(PLATFORM_ID) private platformId: object,
    private contexts: ChildrenOutletContexts,
    private router: Router,
    private auth: Auth,

    private firestore: Firestore,

    private firestoreService: FirestoreService,
  ) {

    this.firestore = this.firestoreService.getInstanceDB('easyscrape')
    // Set the initial values
    this.authorized = this.loading = false

    this.showProfileMenu = false

    this.user$ = of(null)
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    if (isPlatformBrowser(this.platformId))
      this.GetUserProfile()
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
          // console.log(user)
          return from(getUserData(user, this.firestore))
        }
        else {
          this.authorized = false
          this.userLoading = false
          return of(null)
        }
      }),
      catchError(error => {
        this.userLoading = false
        return of(null)
      })
    )

  }


  openProfileMenu(event?: any): void {

    // if user push profile button
    if (event && (event.target.alt === "user photo"))
      this.showProfileMenu = true

    // on outside click
    else this.showProfileMenu = !this.showProfileMenu

  }

  closeProfileMenu(event: Event, username: string) {
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
        this.router.navigate([username + '/account/settings'])
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
  }
}
