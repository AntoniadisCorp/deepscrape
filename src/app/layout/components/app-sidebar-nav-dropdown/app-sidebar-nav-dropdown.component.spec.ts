import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSidebarNavDropdownComponent } from './app-sidebar-nav-dropdown.component';
import { getTestProviders } from 'src/app/testing';

describe('AppSidebarNavDropdownComponent', () => {
  let component: AppSidebarNavDropdownComponent;
  let fixture: ComponentFixture<AppSidebarNavDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarNavDropdownComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarNavDropdownComponent);
    component = fixture.componentInstance;
    component.link = { children: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isBadge should return true when link has badge', () => {
    component.link = { badge: { color: 'primary' }, children: [] };

    expect(component.isBadge()).toBeTrue();
  });

  it('isIcon should return false when icon is missing', () => {
    component.link = { children: [] };

    expect(component.isIcon()).toBeFalse();
  });

  it('openMenu should default to true from constructor', () => {
    expect(component.openMenu).toBeTrue();
  });
});
