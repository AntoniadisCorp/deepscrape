import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { AppSidebarNavLinkComponent } from '../app-sidebar-nav-link/app-sidebar-nav-link.component';
import { AppSidebarNavDropdownComponent } from '../app-sidebar-nav-dropdown/app-sidebar-nav-dropdown.component';

@Component({
  selector: 'app-sidebar-nav-item',
  standalone: true,
  imports: [NgClass, AppSidebarNavLinkComponent, AppSidebarNavDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-sidebar-nav-item.component.html',
  styleUrl: './app-sidebar-nav-item.component.scss'
})
export class AppSidebarNavItemComponent {
  @Input() item: any
  @Input() sidebarTemp!: TemplateRef<any>

  @Output() sidebarClosed = new EventEmitter<boolean>()

  showMenu: boolean

  public hasClass() {
    return this.item.class ? true : false
  }

  public isDropdown() {
    return this.item.children
  }

  /*  public openDropDownMenu(value: any) {
 
     console.log(value, 'dasddasd')
     if (value === this.toggleMenu) // in value was same as this component
       this.toggleMenu = !value
     else this.toggleMenu = value
   } */

  public thisUrl() {
    return this.item.url
  }

  public isActive() {
    return this.router.isActive(this.thisUrl(), true)
  }

  private isChildActive() {

    const children: Array<any> = this.item.children
    const url: string = this.router.url

    for (const el of children)
      return url.indexOf(el.url) > -1 // console.log('is Active:?? ', el.url === url, el.url, url, url.indexOf(el.url))


    return false
  }

  openDropDownMenu(): void {

    if (this.isDropdown()) {
      this.item.dropdown = this.showMenu = !this.showMenu
      // console.log(this.item.dropdown, 'nav-link')
    }
  }

  onSidebarClose(event: boolean) {
    this.sidebarClosed.emit(event)
  }

  constructor(private router: Router) {
    this.showMenu = false
  }
}
