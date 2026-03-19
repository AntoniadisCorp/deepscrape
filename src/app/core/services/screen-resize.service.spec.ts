import { TestBed } from '@angular/core/testing';

import { ScreenResizeService } from './screen-resize.service';
import { getTestProviders } from 'src/app/testing';

describe('ScreenResizeService', () => {
  let service: ScreenResizeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(ScreenResizeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
