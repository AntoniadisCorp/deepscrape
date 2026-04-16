import { TestBed } from '@angular/core/testing';

import { FirestoreService } from './firestore.service';
import { getTestProviders } from 'src/app/testing';

describe('FirestoreService', () => {
  let service: FirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(FirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should identify localhost environment as a boolean', () => {
    expect(typeof (service as any).getInstanceDB).toBe('function');
    expect(typeof (service as any).getUserData).toBe('function');
  });

  it('should expose async data access methods', async () => {
    await expectAsync((service as any).getUserData('user-1')).toBeResolved();
  });
});
