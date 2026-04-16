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

  it('should report variant and children state based on link input', () => {
    component.link.variant = 'outlined';
    component.link.children = [{ name: 'child', url: '/child' }];

    expect(component.hasVariant()).toBeTrue();
    expect(component.hasChildren()).toBeTrue();
  });

  it('should report badge and icon availability', () => {
    component.link.badge = { color: 'warn' };
    component.link.icon = { fontSet: 'material-icons', fontIcon: 'home' };

    expect(component.isBadge()).toBeTrue();
    expect(component.isIcon()).toBeTrue();
  });

  it('should detect external and internal urls', () => {
    component.link.url = 'https://example.com';
    expect(component.isServicealLink()).toBeTrue();

    component.link.url = '/dashboard';
    expect(component.isServicealLink()).toBeFalse();
  });

  it('shouldDisplaySvgIcon should return svg icon name only for plain string icons', () => {
    expect((component as any).shouldDisplaySvgIcon('lucide-home')).toBe('lucide-home');
    expect((component as any).shouldDisplaySvgIcon({ fontSet: 'material-icons' })).toBe('');
  });

  it('themeIsDark should reflect local storage value', () => {
    const getItemSpy = spyOn((component as any).localStorage, 'getItem').and.returnValue('true');

    expect(component.themeIsDark()).toBeTrue();
    expect(getItemSpy).toHaveBeenCalled();
  });

  it('ngOnDestroy should unsubscribe route subscription', () => {
    const unsubscribeSpy = jasmine.createSpy('unsubscribe');
    (component as any).routeSub = { unsubscribe: unsubscribeSpy };

    component.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
