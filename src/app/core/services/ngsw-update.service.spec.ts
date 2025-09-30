import { TestBed } from '@angular/core/testing';

import { NgswUpdateService } from './ngsw-update.service';

describe('NgswUpdateService', () => {
  let service: NgswUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgswUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
