import { TestBed } from '@angular/core/testing';

import { SvgiconService } from './svgicon.service';

describe('SvgiconService', () => {
  let service: SvgiconService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SvgiconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
