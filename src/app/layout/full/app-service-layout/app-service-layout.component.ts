import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChildrenOutletContexts, RouterLink, RouterOutlet } from '@angular/router';
import { fadeInOutAnimation } from 'src/app/animations';
import { LocalStorage } from 'src/app/core/services';
import { themeStorageKey, ThemeToggleComponent } from 'src/app/shared';

@Component({
  selector: 'app-service-layout',
  imports: [RouterOutlet, RouterLink, ThemeToggleComponent],
  templateUrl: './app-service-layout.component.html',
  styleUrl: './app-service-layout.component.scss',
  animations: [fadeInOutAnimation]
})
export class AppServiceLayoutComponent {

  private localStorage = inject(LocalStorage)
  constructor(private contexts: ChildrenOutletContexts) { }
  getAnimationData(outlet: RouterOutlet) {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation']
    // return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation']
  }

  themeIsDark() {

    return this.localStorage?.getItem(themeStorageKey) === 'true'
  }

}
