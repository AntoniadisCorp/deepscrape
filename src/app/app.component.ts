import { ChangeDetectorRef, Component, DestroyRef, inject, PLATFORM_ID, ViewChild } from '@angular/core'
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { HttpClient } from '@angular/common/http'
import { LoadingBarRouterModule } from '@ngx-loading-bar/router'
import { Subscription } from 'rxjs/internal/Subscription'
import { LoggerService, SnackbarService, SvgIconService, HeartbeatService, FirestoreService, AnalyticsService, AuthService } from './core/services'
import { AnimatedBgComponent, LangPickerComponent, ThemeToggleComponent } from './shared'
import { SizeDetectorComponent, SnackbarComponent, SnackBarType } from './core/components'
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client'
import { catchError, filter, forkJoin, map, Observable, of, switchMap, tap, timer } from 'rxjs'
import { isPlatformBrowser, isPlatformServer } from '@angular/common'
import { fadeInOutAnimation } from './animations'
import { Inject, OnInit, OnDestroy, AfterViewInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NgswUpdateService } from './core/services/ngsw-update.service'
import { Analytics } from '@angular/fire/analytics'
import { environment } from 'src/environments/environment'

/* 
                     ,//@@@.
                .///////@@@@@@@&.
           ,////////////@@@@@@@@@@@@@/
      ./////////////////#@@@@@@@@@@@@@@@@@,
 ,/////////////////.         ,&@@@@@@@@@@@@@@@@#
/////////////.                     %@@@@@@@@@@@@@
/////////.                             .%@@@@@@@@
//////.                                   /@@@@@@
///////     @@%     .@@/    .@@@@@@/      %@@@@@@
.//////     @@@@(   .@@/   @@@%. ,@@@#    @@@@@@&
.//////     @@%@@@  .@@/  &@@             @@@@@@(
 //////     @@# ,@@@.@@/  @@@   &@@@@@.   @@@@@@.
 //////,    @@#   %@@@@/  ,@@@    *@@#   ,@@@@@@
 //////.    @@#     @@@/    @@@@@@@@,    #@@@@@@
 ,//////                                 @@@@@@&
 .//////                                 @@@@@@/
  //////.      @@@  @@@  @@  @ @@@@     .@@@@@@.
  //////,     @    @   @ @ @ @ @==      (@@@@@@)
  .//////      @@@  @@@  @  @@ @        &@@@@@@
  .///////.                           %@@@@@@@&
   ///////////                    ,@@@@@@@@@@@(
     ,///////////,             #@@@@@@@@@@@&
        .///////////.       &@@@@@@@@@@@%
           ./////////////@@@@@@@@@@@@*
              ./////////@@@@@@@@@@,
                  ./////@@@@@@%
                     .//@@@#

     The World's Original Angular Conference
      May 1st–3rd 2019 Salt Lake City, Utah */

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingBarRouterModule, LoadingBarHttpClientModule, MatProgressSpinner, 
    SnackbarComponent, SizeDetectorComponent, AnimatedBgComponent
  ],
  // changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ThemeToggleComponent, NgswUpdateService, LangPickerComponent, LoggerService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  // host: {
  //   '[@routeAnimation]': 'getRouteAnimationData(routerOutlet)',
  //   '[style.backgroundColor]': 'isLoading ? "transparent" : ""'
  //  }, // Set background color to transparent when loading
  animations: [fadeInOutAnimation]
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroyRef = inject(DestroyRef)
  private cdr = inject(ChangeDetectorRef)
  private analytics = inject(Analytics)
  private heartbeatService = inject(HeartbeatService)
  @ViewChild(SnackbarComponent) snackbar!: SnackbarComponent
  @ViewChild(RouterOutlet) outlet?: RouterOutlet
  protected snackbarMessage = ''
  protected snackbarAction = ''
  protected snackbarType: SnackBarType = SnackBarType.info
  protected snackbarDuration = 3000
  protected isBrowser = false

  protected isLoading: boolean = false
  protected showRouteLoader: boolean = false
  protected route = 'initial'
  protected isAuthState$: Observable<boolean | null> = of(null)

  private readonly loaderDelayMs = 120
  private readonly loaderMinVisibleMs = 220
  private loaderDelaySubscription: Subscription | null = null
  private loaderHideSubscription: Subscription | null = null
  private loaderShownAt = 0
  private hasViewInitialized = false

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private matIconRegistry: SvgIconService,
    private router: Router,
    private http: HttpClient,
    private theme: ThemeToggleComponent,
    private snackbarService: SnackbarService,
    private authService: AuthService,
    private ngswUpdate: NgswUpdateService,
    private analyticsService: AnalyticsService,
    private fireService: FirestoreService // Inject FirestoreService
    // Inject ActivatedRoute to access route data
    // private activatedRoute: ActivatedRoute,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId)

    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event) => {
          if (event instanceof NavigationStart) {
            this.beginRouteLoading()
          } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
            this.endRouteLoading()
          }
        }),
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        tap((event) => {
          this.endRouteLoading()
          this.route = event.urlAfterRedirects
        }),
        switchMap((event) =>
          this.analyticsService.trackEvent('page_view', {
            page: event.urlAfterRedirects,
            timestamp: new Date().toISOString()
          }).pipe(
            catchError((error) => {
              console.error('Error tracking page view event:', error)
              return of(null)
            })
          )
        )
      )
      .subscribe()

    // Register SVG resolver for both browser and SSR so MatIcon can resolve named icons consistently.
    this.matIconRegistry.addSvgIconResolver()
  }

  get title() {
    return 'deepscrape'
  }

  get token() {
    return this.authService.token
  }
  ngOnInit() {

    if (!this.router.navigated) {
      this.beginRouteLoading()
    } else {
      this.endRouteLoading()
    }

    this.theme.setDefaultTheme()

    const isBrowser = isPlatformBrowser(this.platformId)
    // Make a request to the status endpoint to trigger guestTracker
    if (isBrowser && environment.production) {
      this.http.get('/csrf-token', { withCredentials: true })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError(() => of(null)),
        )
        .subscribe()

      // HeartbeatService will be started only for authenticated users
      // Send custom analytics event to backend
      forkJoin([
        this.analyticsService.sendStatus(),
      ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([statusResponse]) => {
          console.log('API Status Check:', statusResponse)
        },
        error: (error) => {
          console.error('Error checking API status or sending analytics event:', error)
        }
      })
      
    
    }

  }


  ngAfterViewInit() {
    this.hasViewInitialized = true
    

    // Set the initial values
    this.isAuthState$ = this.authService.isAuthenticated()
      .pipe(
        map((isAuthData) => {
          const { isAuthenticated } = isAuthData
          console.log('User is logged in: ', isAuthenticated)
          return isAuthenticated
        })
      )

    this.snackbarService.setSnackbar(this.snackbar)
    this.cdr.detectChanges()
  }

  onSnackbarAction() {
    // console.log('Snackbar action clicked')
  }

  onSnackbarClose() {
    // console.log('Snackbar closed')
  }

  // Helper method to get the animation data from the router outlet
  getRouteAnimationData(outlet?: RouterOutlet | null) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'] || 'initial'
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.loaderDelaySubscription?.unsubscribe()
    this.loaderDelaySubscription = null

    this.loaderHideSubscription?.unsubscribe()
    this.loaderHideSubscription = null

    this.heartbeatService.stop() // Stop heartbeat when app is destroyed
  }

  private beginRouteLoading(): void {
    if (!this.isBrowser) {
      return
    }

    this.isLoading = true

    if (!this.hasViewInitialized) {
      return
    }

    this.loaderHideSubscription?.unsubscribe()
    this.loaderHideSubscription = null

    this.loaderDelaySubscription?.unsubscribe()

    this.loaderDelaySubscription = timer(this.loaderDelayMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
      if (!this.isLoading) {
        return
      }

      this.showRouteLoader = true
      this.loaderShownAt = Date.now()
    })
  }

  private endRouteLoading(): void {
    if (!this.isBrowser) {
      return
    }

    this.isLoading = false

    if (!this.hasViewInitialized) {
      this.showRouteLoader = false
      return
    }

    this.loaderDelaySubscription?.unsubscribe()
    this.loaderDelaySubscription = null

    if (!this.showRouteLoader) {
      return
    }

    const visibleFor = Date.now() - this.loaderShownAt
    const remaining = Math.max(0, this.loaderMinVisibleMs - visibleFor)

    this.loaderHideSubscription?.unsubscribe()

    this.loaderHideSubscription = timer(remaining)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
      if (!this.isLoading) {
        this.showRouteLoader = false
      }
    })
  }

}
