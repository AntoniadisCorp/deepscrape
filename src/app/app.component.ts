import { Component, ViewChild } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { Subscription } from 'rxjs/internal/Subscription';
import { SnackbarService, SvgIconService } from './core/services';
import { ThemeToggleComponent } from './shared';
import { SizeDetectorComponent, SnackbarComponent, SnackBarType } from './core/components';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';

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
  standalone: true,
  imports: [RouterOutlet, LoadingBarRouterModule, LoadingBarHttpClientModule, MatProgressSpinner, SnackbarComponent,
    SizeDetectorComponent,
  ],
  providers: [ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  protected snackbarMessage = '';
  protected snackbarAction = '';
  protected snackbarType: SnackBarType = SnackBarType.info;
  protected snackbarDuration = 3000;
  @ViewChild(SnackbarComponent) snackbar!: SnackbarComponent;
  protected title = 'deepscrape';
  protected isLoading = false;

  private routerEventSubscription: Subscription

  constructor(

    private matIconRegistry: SvgIconService,
    private router: Router,
    private theme: ThemeToggleComponent,

    private snackbarService: SnackbarService,
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

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.theme.setDefaultTheme()
  }

  ngAfterViewInit() {

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
