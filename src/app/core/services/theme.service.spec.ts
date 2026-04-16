import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';
import { getTestProviders } from 'src/app/testing';
import { LocalStorage } from './storage.service';
import { themeStorageKey } from 'src/app/shared';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageMock: jasmine.SpyObj<Storage>;

  const createService = (): ThemeService =>
    TestBed.runInInjectionContext(() => new ThemeService());

  beforeEach(() => {
    localStorageMock = jasmine.createSpyObj('Storage', ['getItem', 'setItem', 'removeItem', 'clear']);
    localStorageMock.getItem.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: LocalStorage, useValue: localStorageMock },
      ],
    });

    service = createService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with light mode when no stored preference', () => {
    localStorageMock.getItem.and.returnValue(null);
    const newService = createService();
    expect(newService.isDarkMode).toBe(false);
  });

  it('should initialize with dark mode when stored as true', () => {
    localStorageMock.getItem.and.returnValue('true');
    const newService = createService();
    expect(newService.isDarkMode).toBe(true);
  });

  it('should emit theme changes via observable', (done) => {
    localStorageMock.getItem.and.returnValue(null);
    const newService = createService();

    newService.isDarkMode$.subscribe((isDark) => {
      expect(isDark).toBe(false);
      done();
    });
  });

  it('should update theme when setDarkMode is called', (done) => {
    localStorageMock.getItem.and.returnValue(null);
    const newService = createService();

    newService.setDarkMode(true);
    expect(newService.isDarkMode).toBe(true);

    newService.isDarkMode$.subscribe((isDark) => {
      expect(isDark).toBe(true);
      done();
    });
  });

  it('should toggle between dark and light modes', (done) => {
    localStorageMock.getItem.and.returnValue(null);
    const newService = createService();

    expect(newService.isDarkMode).toBe(false);
    newService.setDarkMode(true);
    expect(newService.isDarkMode).toBe(true);
    newService.setDarkMode(false);

    newService.isDarkMode$.subscribe((isDark) => {
      expect(isDark).toBe(false);
      done();
    });
  });
});
