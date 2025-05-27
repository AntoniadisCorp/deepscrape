import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output, TemplateRef, ViewChild } from '@angular/core';
import { navigation } from 'src/app/_nav';
import { AppSidebarNavItemComponent } from '../app-sidebar-nav-item/app-sidebar-nav-item.component';
import { LoadingService } from 'src/app/core/services';

@Component({
  selector: 'app-sidebar-nav',
  imports: [NgIf, NgFor, AppSidebarNavItemComponent, NgTemplateOutlet,],
  templateUrl: './app-sidebar-nav.component.html',
  styleUrl: './app-sidebar-nav.component.scss'
})
export class AppSidebarNavComponent {

  @ViewChild('sidebarNavTemplate') sidebarNavTemplate: TemplateRef<any>

  constructor(private loadingService: LoadingService) { this.loadingService.startLoading(); }

  ngAfterViewInit() {


    setTimeout(() => {
      this.loadingService.stopLoading();
    }, 400);
    // this.loadingService.stopLoading();
    /* this.cdr.detectChanges() */

  }


  protected navigation = navigation

  public isDivider(item: any) {
    // console.log(item)
    return item.divider ? true : false
  }
  public isTitle(item: any) {
    return item.title ? true : false
  }

}
