import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChildrenOutletContexts, RouterLink, RouterOutlet } from '@angular/router';
import { fadeInOutSlideAnimation } from 'src/app/animations';
import { ThemeToggleComponent } from 'src/app/shared';

@Component({
  selector: 'app-service-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, ThemeToggleComponent],
  templateUrl: './app-service-layout.component.html',
  styleUrl: './app-service-layout.component.scss',
  animations: [fadeInOutSlideAnimation],
})
export class AppServiceLayoutComponent {

  constructor(private contexts: ChildrenOutletContexts) { }
  getAnimationData(outlet: RouterOutlet) {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation']
    // return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation']
  }
}
