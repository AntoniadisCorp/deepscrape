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
});
