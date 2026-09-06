import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { DropdownCartComponent } from './dropdown-cart.component';
import { getTestProviders } from 'src/app/testing';

describe('DropdownCartComponent', () => {
  let component: DropdownCartComponent;
  let fixture: ComponentFixture<DropdownCartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownCartComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownCartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should sync menu state from ToggleBtnService stream', () => {
    const menuOpen$ = new Subject<boolean>();
    (component as any).btnService = {
      menuOpen$,
      closeMenu: jasmine.createSpy('closeMenu'),
    };

    component.ngOnInit();
    menuOpen$.next(true);
    expect(component.showCartMenu).toBeTrue();

    menuOpen$.next(false);
    expect(component.showCartMenu).toBeFalse();
  });

  it('openLinkMenu should navigate to browser config and close menu', () => {
    const navigateSpy = spyOn((component as any).router, 'navigate');
    const closeSpy = spyOn(component as any, 'closeCartMenu');

    (component as any).openLinkMenu(new Event('click'), 'browserProfile');

    expect(navigateSpy).toHaveBeenCalledWith(['/crawlpack/browser'], { fragment: 'controlling-each-browser' });
    expect(closeSpy).toHaveBeenCalled();
  });

  it('closeCartMenu should close menu after timeout', fakeAsync(() => {
    const closeMenuSpy = jasmine.createSpy('closeMenu');
    (component as any).btnService = {
      menuOpen$: new Subject<boolean>(),
      closeMenu: closeMenuSpy,
    };

    (component as any).closeCartMenu(new Event('click'));
    tick(100);

    expect(closeMenuSpy).toHaveBeenCalled();
  }));

  it('parseCartItemDate should return a relative date string', () => {
    const result = (component as any).parseCartItemDate(Date.now() - 1000);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('ngOnDestroy should unsubscribe menu subscription', () => {
    const unsubscribeSpy = jasmine.createSpy('unsubscribe');
    (component as any).btnSubs = { unsubscribe: unsubscribeSpy };

    component.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
