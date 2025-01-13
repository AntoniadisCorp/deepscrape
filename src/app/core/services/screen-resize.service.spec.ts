import { TestBed } from '@angular/core/testing';

import { ScreenResizeService } from './screen-resize.service';

describe('ScreenResizeService', () => {
  let service: ScreenResizeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScreenResizeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
