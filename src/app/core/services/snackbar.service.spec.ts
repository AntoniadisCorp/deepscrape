import { TestBed } from '@angular/core/testing';

import { SnackbarService } from './snackbar.service';
import { getTestProviders } from 'src/app/testing';

describe('SnackbarService', () => {
  let service: SnackbarService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(SnackbarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
