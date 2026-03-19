import { TestBed } from '@angular/core/testing';

import { PackService } from './pack.service';
import { getTestProviders } from 'src/app/testing';

describe('PackService', () => {
  let service: PackService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(PackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
