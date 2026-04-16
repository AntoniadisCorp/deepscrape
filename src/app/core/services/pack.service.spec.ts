import { TestBed } from '@angular/core/testing';

import { PackService } from './pack.service';
import { getTestProviders } from 'src/app/testing';
import { CONTROL_NAME } from './pack.service';

describe('PackService', () => {
  let service: PackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...getTestProviders(), { provide: CONTROL_NAME, useValue: 'browserProfiles' }],
    });

    service = TestBed.inject(PackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize controlName from injection token', () => {
    expect(service.controlName).toBe('browserProfiles');
  });

  it('should allow updating controlName through setter', () => {
    service.controlName = 'crawlConfigs';

    expect(service.controlName).toBe('crawlConfigs');
  });

  it('should expose browser profile stream for browserProfiles control', () => {
    expect(service.browserProfiles$).toBeDefined();
    expect(service.totalPagesBrowsers$).toBeDefined();
    expect(service.inTotalBrowsers$).toBeDefined();
  });
});
