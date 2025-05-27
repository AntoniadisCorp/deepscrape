import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { Subscription } from 'rxjs/internal/Subscription';
import { AuthService, SnackbarService, SvgIconService } from './core/services';
import { ThemeToggleComponent } from './shared';
import { SizeDetectorComponent, SnackbarComponent, SnackBarType } from './core/components';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { Auth, authState, user, User } from '@angular/fire/auth';
import { map, Observable, of, startWith, tap } from 'rxjs';
import { AsyncPipe } from '@angular/common';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild(SnackbarComponent) snackbar!: SnackbarComponent;
  protected snackbarMessage = '';
  protected snackbarAction = '';
  protected snackbarType: SnackBarType = SnackBarType.info;
  protected snackbarDuration = 3000;

  protected isLoading: boolean = true
  protected isAuthState$: Observable<boolean | null> = of(null)

  private routerEventSubscription: Subscription
  constructor(

    private matIconRegistry: SvgIconService,
    private router: Router,
    private theme: ThemeToggleComponent,

    private snackbarService: SnackbarService,
    private authService: AuthService,


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
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.theme.setDefaultTheme()



  }


  ngAfterViewInit() {

    // Set the initial values
    this.isAuthState$ = this.authService.isAuthenticated().pipe(
      map((isAuth) => {
        console.log('User is logged in: ', isAuth)
        return isAuth
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
}
