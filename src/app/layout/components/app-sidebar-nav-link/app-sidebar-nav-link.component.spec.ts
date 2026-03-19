import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSidebarNavLinkComponent } from './app-sidebar-nav-link.component';
import { getTestProviders } from 'src/app/testing';

describe('AppSidebarNavLinkComponent', () => {
  let component: AppSidebarNavLinkComponent;
  let fixture: ComponentFixture<AppSidebarNavLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarNavLinkComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarNavLinkComponent);
    component = fixture.componentInstance;
    component.link = {
      name: 'Dashboard',
      url: '/dashboard',
      active: false,
      dropdown: false,
      icon: { fontSet: 'material-icons-outlined', fontIcon: 'home' },
      children: [],
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
