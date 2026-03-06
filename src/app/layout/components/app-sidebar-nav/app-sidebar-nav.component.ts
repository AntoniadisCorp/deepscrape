import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output, TemplateRef, ViewChild } from '@angular/core';
import { navigation } from 'src/app/_nav';
import { AppSidebarNavItemComponent } from '../app-sidebar-nav-item/app-sidebar-nav-item.component';
import { LoadingService } from 'src/app/core/services';
import { MatIcon } from '@angular/material/icon';
import { timer } from 'rxjs/internal/observable/timer';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-sidebar-nav',
  imports: [AppSidebarNavItemComponent, NgTemplateOutlet, MatIcon, NgClass],
  templateUrl: './app-sidebar-nav.component.html',
  styleUrl: './app-sidebar-nav.component.scss'
})
export class AppSidebarNavComponent {

  @ViewChild('sidebarNavTemplate') sidebarNavTemplate: TemplateRef<any>
  private navigation = navigation
  protected isAdmin = false

  constructor(private loadingService: LoadingService, private authService: AuthService) {
    this.loadingService.startLoading()
    this.isAdmin = this.authService.isAdmin
  }

  ngAfterViewInit() {
    timer(400).subscribe(() => {
      this.loadingService.stopLoading();
    })
  }

  protected get filteredNavigation() {
    // Only show 'Admin' tab and its children if user is admin
    return this.navigation
      .map(item => {
        if (item.name === 'Admin') {
          return this.isAdmin ? item : null;
        }
        return item;
      })
      .filter(item => !!item);
  }

  public isDivider(item: any) {
    // console.log(item)
    return item.divider ? true : false
  }
  public isTitle(item: any) {
    return item.title ? true : false
  }

}
