import { TestBed } from '@angular/core/testing';

import { ToggleBtnService } from './togglebtn.service';

describe('TogglebtnService', () => {
  let service: ToggleBtnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToggleBtnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
