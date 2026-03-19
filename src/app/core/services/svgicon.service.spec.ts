import { TestBed } from '@angular/core/testing';

import { SvgIconService } from './svgicon.service';
import { getTestProviders } from 'src/app/testing';

describe('SvgIconService', () => {
  let service: SvgIconService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(SvgIconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
