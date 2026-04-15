import { TestBed } from '@angular/core/testing';
import { CookieService } from 'ngx-cookie-service';

import { GuestTrackingService } from './guest-tracking.service';
import { FirestoreService } from './firestore.service';
import { LocalStorage } from './storage.service';
import { WindowToken } from './window.service';
import { getTestProviders } from 'src/app/testing';

describe('GuestTrackingService', () => {
  let service: GuestTrackingService;
  let cookieStore: Record<string, string>;
  let cookieServiceMock: {
    check: jasmine.Spy;
    delete: jasmine.Spy;
    deleteAll: jasmine.Spy;
    get: jasmine.Spy;
    getAll: jasmine.Spy;
    set: jasmine.Spy;
  };
  let firestoreServiceMock: {
    callFunction: jasmine.Spy;
    linkGuestToUser: jasmine.Spy;
    setUserLoginMetrics: jasmine.Spy;
  };
  let localStorageMock: Storage;

  beforeEach(() => {
    cookieStore = {
      gid: 'guest-cookie-id',
      guest_fp: '',
    };

    cookieServiceMock = {
      check: jasmine.createSpy('check').and.callFake((name: string) => Boolean(cookieStore[name])),
      delete: jasmine.createSpy('delete').and.callFake((name: string) => {
        delete cookieStore[name];
      }),
      deleteAll: jasmine.createSpy('deleteAll').and.callFake(() => {
        cookieStore = {};
      }),
      get: jasmine.createSpy('get').and.callFake((name: string) => cookieStore[name] || ''),
      getAll: jasmine.createSpy('getAll').and.callFake(() => ({ ...cookieStore })),
      set: jasmine.createSpy('set').and.callFake((name: string, value: string) => {
        cookieStore[name] = value;
      }),
    };

    firestoreServiceMock = {
      callFunction: jasmine.createSpy('callFunction').and.resolveTo({
        success: true,
        sessionId: 'session-123',
        expiresAt: new Date().toISOString(),
      }),
      linkGuestToUser: jasmine.createSpy('linkGuestToUser').and.resolveTo({
        err: null,
        guestInfo: { id: 'guest-linked-id' },
      }),
      setUserLoginMetrics: jasmine.createSpy('setUserLoginMetrics').and.resolveTo({
        success: true,
        loginId: 'login-123',
      }),
    };

    const localStore = new Map<string, string>();
    localStorageMock = {
      length: 0,
      clear: () => localStore.clear(),
      getItem: (key: string) => localStore.get(key) ?? null,
      key: (index: number) => Array.from(localStore.keys())[index] ?? null,
      removeItem: (key: string) => {
        localStore.delete(key);
      },
      setItem: (key: string, value: string) => {
        localStore.set(key, value);
      },
    } as Storage;

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: CookieService, useValue: cookieServiceMock },
        { provide: FirestoreService, useValue: firestoreServiceMock },
        { provide: LocalStorage, useValue: localStorageMock },
        {
          provide: WindowToken,
          useValue: {
            crypto: {
              subtle: {
                digest: async () => new Uint8Array([1, 2, 3, 4]).buffer,
              },
            },
            navigator: {
              connection: { effectiveType: '4g' },
              platform: 'Win32',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123 Safari/537.36',
            },
          } as unknown as Window,
        },
      ],
    });

    service = TestBed.inject(GuestTrackingService);
  });

  it('records post-login session state and persists aid/loginId', async () => {
    await service.ensurePostLoginSession({ userId: 'user-1', providerId: 'password' });

    expect(firestoreServiceMock.callFunction).toHaveBeenCalledTimes(1);
    expect(firestoreServiceMock.linkGuestToUser).toHaveBeenCalledOnceWith('user-1', 'guest-cookie-id');
    expect(firestoreServiceMock.setUserLoginMetrics).toHaveBeenCalledTimes(1);
    expect(localStorageMock.getItem('loginId')).toBe('login-123');

    const aidPayload = JSON.parse(cookieStore['aid']);
    expect(aidPayload).toEqual({
      guestId: 'guest-linked-id',
      loginId: 'login-123',
      userId: 'user-1',
    });
    expect(cookieStore['gid']).toBeUndefined();
  });

  it('does not duplicate metrics writes for the same initialized session', async () => {
    await service.ensurePostLoginSession({ userId: 'user-1', providerId: 'password' });
    await service.ensurePostLoginSession({ userId: 'user-1', providerId: 'password' });

    expect(firestoreServiceMock.setUserLoginMetrics).toHaveBeenCalledTimes(1);
  });
});
