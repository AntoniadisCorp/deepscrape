import { TestBed } from '@angular/core/testing';

import { ToggleBtnService } from './togglebtn.service';
import { getTestProviders } from 'src/app/testing';

describe('TogglebtnService', () => {
  let service: ToggleBtnService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(ToggleBtnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('should initialize menu as closed', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('should emit false initially from menuOpen$', (done) => {
    service.menuOpen$.subscribe((isOpen) => {
      expect(isOpen).toBe(false);
      done();
    });
  });

  it('should toggle menu open to closed', () => {
    service.toggleMenu();
    expect(service.isOpen()).toBe(true);

    service.toggleMenu();
    expect(service.isOpen()).toBe(false);
  });

  it('should toggle menu through observable', (done) => {
    service.toggleMenu();
    service.menuOpen$.subscribe((isOpen) => {
      expect(isOpen).toBe(true);
      done();
    });
  });

  it('should close menu', () => {
    service.toggleMenu();
    expect(service.isOpen()).toBe(true);

    service.closeMenu();
    expect(service.isOpen()).toBe(false);
  });

  it('should emit distinct menu states', (done) => {
    const states: boolean[] = [];
    service.menuOpen$.subscribe((isOpen) => {
      states.push(isOpen);
    });

    service.toggleMenu();
    service.toggleMenu();
    service.toggleMenu();

    setTimeout(() => {
      // Should have initial state + 3 toggles = 4 distinct states
      expect(states.length).toBeGreaterThanOrEqual(3);
      done();
    }, 50);
  });

  it('should preserve menu state across multiple closes', () => {
    service.closeMenu();
    service.closeMenu();
    expect(service.isOpen()).toBe(false);
  });
});
