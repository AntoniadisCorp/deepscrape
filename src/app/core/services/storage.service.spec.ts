import { TestBed } from '@angular/core/testing';
import { LocalStorage, SessionStorage, NoopStorage, STORAGE_PROVIDERS } from './storage.service';
import { WindowToken } from './window.service';

describe('StorageService', () => {
  let localStorage: Storage;
  let sessionStorage: Storage;
  let windowMock: Window;

  beforeEach(() => {
    windowMock = {
      localStorage: {
        getItem: jasmine.createSpy('getItem'),
        setItem: jasmine.createSpy('setItem'),
        removeItem: jasmine.createSpy('removeItem'),
        clear: jasmine.createSpy('clear'),
        key: jasmine.createSpy('key'),
        length: 0,
      },
      sessionStorage: {
        getItem: jasmine.createSpy('getItem'),
        setItem: jasmine.createSpy('setItem'),
        removeItem: jasmine.createSpy('removeItem'),
        clear: jasmine.createSpy('clear'),
        key: jasmine.createSpy('key'),
        length: 0,
      },
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: WindowToken, useValue: windowMock },
        STORAGE_PROVIDERS,
      ],
    });

    localStorage = TestBed.inject(LocalStorage);
    sessionStorage = TestBed.inject(SessionStorage);
  });

  it('should provide LocalStorage', () => {
    expect(localStorage).toBeDefined();
    expect(localStorage).toBe(windowMock.localStorage);
  });

  it('should provide SessionStorage', () => {
    expect(sessionStorage).toBeDefined();
    expect(sessionStorage).toBe(windowMock.sessionStorage);
  });

  it('should use NoopStorage when localStorage is not available', () => {
    const windowMockWithException = {
      get localStorage() {
        throw new Error('localStorage not available');
      },
      get sessionStorage() {
        throw new Error('sessionStorage not available');
      }
    } as any;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: WindowToken, useValue: windowMockWithException },
        STORAGE_PROVIDERS,
      ],
    });

    const noopLocalStorage = TestBed.inject(LocalStorage);
    const noopSessionStorage = TestBed.inject(SessionStorage);

    expect(noopLocalStorage instanceof NoopStorage).toBe(true);
    expect(noopSessionStorage instanceof NoopStorage).toBe(true);
  });

  it('NoopStorage should implement Storage interface with no-op methods', () => {
    const noopStorage = new NoopStorage();
    expect(noopStorage.length).toBe(0);
    expect(noopStorage.getItem('key')).toBeNull();
    expect(noopStorage.setItem('key', 'value')).toBeUndefined();
    expect(noopStorage.removeItem('key')).toBeUndefined();
    expect(noopStorage.clear()).toBeUndefined();
    expect(noopStorage.key(0)).toBeNull();
  });
});