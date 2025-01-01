import { TestBed } from '@angular/core/testing';

import { PlutoService } from './pluto.service';

describe('PlutoService', () => {
  let service: PlutoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlutoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
