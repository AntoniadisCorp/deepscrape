import { TestBed } from '@angular/core/testing';

import { CacheService } from './cache.service';
import { getTestProviders } from 'src/app/testing';
import { SessionStorage } from './storage.service';

describe('CacheService', () => {
  let service: CacheService;
  let sessionStorageMock: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    sessionStorageMock = jasmine.createSpyObj('Storage', ['getItem', 'setItem', 'removeItem', 'clear', 'key']);
    Object.defineProperty(sessionStorageMock, 'length', {
      value: 0,
      writable: true,
      configurable: true,
    });

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: SessionStorage, useValue: sessionStorageMock },
      ],
    });

    service = TestBed.inject(CacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and retrieve cached value', () => {
    const namespace = 'test-namespace';
    const key = 'test-key';
    const value = { data: 'test-value' };

    sessionStorageMock.setItem.and.callFake((storageKey: string, val: string) => {
      sessionStorageMock.getItem.and.returnValue(val);
    });

    service.set(namespace, key, value);
    expect(sessionStorageMock.setItem).toHaveBeenCalled();
  });

  it('should handle cache expiration', () => {
    const namespace = 'test-namespace';
    const key = 'test-key';
    const value = 'test-value';

    sessionStorageMock.getItem.and.returnValue(
      JSON.stringify({
        value,
        expiresAt: Date.now() - 1000, // Expired
      })
    );

    const result = service.get(namespace, key);
    expect(result).toBeUndefined();
    expect(sessionStorageMock.removeItem).toHaveBeenCalled();
  });

  it('should delete cache entries', () => {
    const namespace = 'test-namespace';
    const key = 'test-key';

    sessionStorageMock.getItem.and.returnValue('some-value');
    const deleted = service.delete(namespace, key);
    expect(deleted).toBe(true);
    expect(sessionStorageMock.removeItem).toHaveBeenCalled();
  });

  it('should check if cache entry exists', () => {
    const namespace = 'test-namespace';
    const key = 'test-key';

    sessionStorageMock.getItem.and.returnValue(
      JSON.stringify({
        value: 'test-value',
        expiresAt: Date.now() + 60000, // Not expired
      })
    );

    const exists = service.has(namespace, key);
    expect(exists).toBe(true);
  });

  it('should clear all entries in namespace', () => {
    const namespace = 'test-namespace';
    const storageKey = 'deepscrape:cache:test-namespace:%22test-key%22';
    Object.defineProperty(sessionStorageMock, 'length', {
      value: 1,
      writable: true,
      configurable: true,
    });
    sessionStorageMock.key.and.returnValue(storageKey);

    service.clear(namespace);

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(storageKey);
  });
});
