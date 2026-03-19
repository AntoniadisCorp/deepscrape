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
});
