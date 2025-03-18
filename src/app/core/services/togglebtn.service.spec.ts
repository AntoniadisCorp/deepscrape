import { TestBed } from '@angular/core/testing';

import { TogglebtnService } from './togglebtn.service';

describe('TogglebtnService', () => {
  let service: TogglebtnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TogglebtnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
