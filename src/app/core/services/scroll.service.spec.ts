import { TestBed } from '@angular/core/testing';

import { ScrollService } from './scroll.service';
import { getTestProviders } from 'src/app/testing';

describe('ScrollService', () => {
  let service: ScrollService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(ScrollService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
