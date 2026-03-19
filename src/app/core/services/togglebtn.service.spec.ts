import { TestBed } from '@angular/core/testing';

import { ToggleBtnService } from './togglebtn.service';
import { getTestProviders } from 'src/app/testing';

describe('TogglebtnService', () => {
  let service: ToggleBtnService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(ToggleBtnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
