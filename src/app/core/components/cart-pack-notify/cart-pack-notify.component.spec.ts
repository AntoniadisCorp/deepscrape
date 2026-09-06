import { TestBed } from '@angular/core/testing';
import { CartPackNotifyComponent } from './cart-pack-notify.component';
import { ToggleBtnService } from '../../services';
import { getTestProviders } from 'src/app/testing';

describe('CartPackNotifyComponent', () => {
  let component: CartPackNotifyComponent;
  let toggleMenuSpy: jasmine.Spy;

  beforeEach(() => {
    toggleMenuSpy = jasmine.createSpy('toggleMenu');
    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: ToggleBtnService, useValue: { toggleMenu: toggleMenuSpy, closeMenu: () => {}, isOpen: () => false } },
      ],
    });
    TestBed.runInInjectionContext(() => {
      component = new CartPackNotifyComponent();
    });
  });

  it('toggleCartDropdown delegates to ToggleBtnService.toggleMenu()', () => {
    (component as any).toggleCartDropdown();
    expect(toggleMenuSpy).toHaveBeenCalledTimes(1);
  });

  it('toggleCartDropdown calls toggleMenu on each invocation', () => {
    (component as any).toggleCartDropdown();
    (component as any).toggleCartDropdown();
    expect(toggleMenuSpy).toHaveBeenCalledTimes(2);
  });
});
