import { TestBed } from '@angular/core/testing';

import { ScrollService } from './scroll.service';
import { getTestProviders } from 'src/app/testing';
import { SessionStorage } from './storage.service';

describe('ScrollService', () => {
  let service: ScrollService;
  let sessionStorageMock: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    sessionStorageMock = jasmine.createSpyObj('Storage', ['getItem', 'setItem', 'removeItem']);
    sessionStorageMock.getItem.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [...getTestProviders(), { provide: SessionStorage, useValue: sessionStorageMock }],
    });

    service = TestBed.inject(ScrollService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse stored scroll position from session storage', () => {
    sessionStorageMock.getItem.and.callFake((key: string) => {
      if (key === 'scrollPosition') {
        return '10,25';
      }

      return null;
    });

    const position = service.getStoredScrollPosition();
    expect(position).toEqual([10, 25]);
  });

  it('should remove stored scroll metadata', () => {
    service.removeStoredScrollInfo();

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('scrollLocationHref');
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('scrollPosition');
  });

  it('should detect when manual restoration requires fixing position', () => {
    service.supportManualScrollRestoration = true;
    service.poppedStateScrollPosition = [0, 200];

    expect(service.needToFixScrollPosition()).toBe(true);
  });
});
