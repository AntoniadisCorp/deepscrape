import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChildrenOutletContexts, RouterLink, RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs/internal/Observable';
import { fadeInOutAnimation } from 'src/app/animations';
import { LocalStorage, ThemeService } from 'src/app/core/services';
import { themeStorageKey, ThemeToggleComponent } from 'src/app/shared';

@Component({
  selector: 'app-service-layout',
  imports: [RouterOutlet, RouterLink, ThemeToggleComponent, AsyncPipe],
  templateUrl: './app-service-layout.component.html',
  styleUrl: './app-service-layout.component.scss',
  animations: [fadeInOutAnimation]
})
export class AppServiceLayoutComponent {

  private localStorage = inject(LocalStorage)
  private themePicker = inject(ThemeService)
  isDarkMode$: Observable<boolean> = this.themePicker.isDarkMode$

  constructor(private contexts: ChildrenOutletContexts) { }
  getAnimationData(outlet: RouterOutlet) {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation']
    // return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation']
  }

  themeIsDark() {

    return this.localStorage?.getItem(themeStorageKey) === 'true'
  }

}
