import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSidebarNavItemComponent } from './app-sidebar-nav-item.component';
import { getTestProviders } from 'src/app/testing';

describe('AppSidebarNavItemComponent', () => {
  let component: AppSidebarNavItemComponent;
  let fixture: ComponentFixture<AppSidebarNavItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarNavItemComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarNavItemComponent);
    component = fixture.componentInstance;
    component.item = {
      name: 'Dashboard',
      url: '/dashboard',
      active: false,
      dropdown: false,
      class: '',
      children: [],
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hasClass should return true when class exists', () => {
    component.item.class = 'active-link';

    expect(component.hasClass()).toBeTrue();
  });

  it('thisUrl should return current item url', () => {
    component.item.url = '/settings';

    expect(component.thisUrl()).toBe('/settings');
  });

  it('openDropDownMenu should toggle dropdown state for dropdown items', () => {
    component.item.children = [{ name: 'Child', url: '/child' }];
    component.item.dropdown = false;

    component.openDropDownMenu();
    expect(component.item.dropdown).toBeTrue();

    component.openDropDownMenu();
    expect(component.item.dropdown).toBeFalse();
  });

  it('openDropDownMenu should not change state when no children exist', () => {
    component.item.children = undefined;
    component.item.dropdown = false;

    component.openDropDownMenu();

    expect(component.item.dropdown).toBeFalse();
    expect(component.showMenu).toBeFalse();
  });
});
