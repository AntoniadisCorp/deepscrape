import { ChangeDetectionStrategy, Component, DestroyRef, inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { Subscription } from 'rxjs/internal/Subscription';
import { AuthService, SnackbarService, SvgIconService } from './core/services';
import { ThemeToggleComponent } from './shared';
import { SizeDetectorComponent, SnackbarComponent, SnackBarType } from './core/components';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { Auth, authState, user, User } from '@angular/fire/auth';
import { map, Observable, of, startWith, tap, switchMap } from 'rxjs';
import { AsyncPipe, DOCUMENT, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { fadeInOutAnimation } from './animations';
import { HttpClient } from '@angular/common/http';
import { Inject, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  //////,     @    @   @ @ @ @ @==      (@@@@@@
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
  imports: [RouterOutlet, LoadingBarRouterModule, LoadingBarHttpClientModule, MatProgressSpinner, SnackbarComponent,
    SizeDetectorComponent
  ],
  // changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  // host: {
  //   '[@routeAnimation]': 'getRouteAnimationData(routerOutlet)',
  //   '[style.backgroundColor]': 'isLoading ? "transparent" : ""'
  //  }, // Set background color to transparent when loading
  animations: [fadeInOutAnimation]
})
export class AppComponent implements OnInit {
  private destroyRef = inject(DestroyRef); 
  @ViewChild(SnackbarComponent) snackbar!: SnackbarComponent;
  protected snackbarMessage = '';
  protected snackbarAction = '';
  protected snackbarType: SnackBarType = SnackBarType.info;
  protected snackbarDuration = 3000;

  protected isLoading: boolean = true
  protected isAuthState$: Observable<boolean | null> = of(null)

  private routerEventSubscription: Subscription
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private matIconRegistry: SvgIconService,
    private router: Router,
    private theme: ThemeToggleComponent,
    private snackbarService: SnackbarService,
    private authService: AuthService,
    private http: HttpClient, // Inject HttpClient
    // Inject ActivatedRoute to access route data
    // private activatedRoute: ActivatedRoute,
  ) {
    this.routerEventSubscription = this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationStart) {
        this.isLoading = true;
      } else if (event instanceof NavigationEnd) {
        this.isLoading = false;
      }
    })

    // Mat SAFE SVGs icons
    this.matIconRegistry.addSvgIconResolver()
  }

  get title() {
    return 'deepscrape'
  }

  get token() {
    return this.authService.token
  }
  ngOnInit(){
    this.theme.setDefaultTheme();

    const isBrowser = isPlatformBrowser(this.platformId)
    // Make a request to the status endpoint to trigger guestTracker
    if (isBrowser) {
      this.http.get(`/status`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          console.log('API Status Check:', response);
        },
        error: (error) => {
          console.error('Error checking API status:', error);
        }
      })
    }
  
  }


  ngAfterViewInit() {

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
  }

  onSnackbarAction() {
    console.log('Snackbar action clicked');
  }

  onSnackbarClose() {
    console.log('Snackbar closed');
  }


  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.routerEventSubscription?.unsubscribe()
  }

  // Helper method to get the animation data from the router outlet
  getRouteAnimationData(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
