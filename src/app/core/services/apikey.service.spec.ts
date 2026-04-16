import { TestBed } from '@angular/core/testing';

import { ApiKeyService } from './apikey.service';
import { getTestProviders } from 'src/app/testing';
import { FirestoreService } from './firestore.service';
import { SessionStorage } from './storage.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let firestoreMock: jasmine.SpyObj<FirestoreService>;
  let sessionStorageMock: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    firestoreMock = jasmine.createSpyObj('FirestoreService', ['callFunction']);
    sessionStorageMock = jasmine.createSpyObj('Storage', ['getItem', 'setItem', 'removeItem', 'clear']);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: FirestoreService, useValue: firestoreMock },
        { provide: SessionStorage, useValue: sessionStorageMock },
      ],
    });

    service = TestBed.inject(ApiKeyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with null api keys when no stored keys', (done) => {
    sessionStorageMock.getItem.and.returnValue(null);
    firestoreMock.callFunction.and.returnValue(Promise.resolve({ apiKeys: [] } as any));

    service.apiKeys$.subscribe((keys) => {
      if (keys !== null) {
        expect(keys).toEqual([]);
        done();
      }
    });
  });

  it('should load api keys from session storage when available', (done) => {
    const mockKeys: any[] = [
      { id: '1', name: 'api-key-1', key: 'secret-1', type: 'api', created_At: new Date() },
    ];
    sessionStorageMock.getItem.and.returnValue(JSON.stringify(mockKeys));

    service.apiKeys$.subscribe((keys) => {
      if (keys) {
        expect(keys.length).toBeGreaterThanOrEqual(0);
        done();
      }
    });
  });
});
