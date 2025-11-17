import { TestBed } from '@angular/core/testing';

import { NgswUpdateService } from './ngsw-update.service';
import { SwUpdate } from '@angular/service-worker';
import { DOCUMENT } from '@angular/common';
import { of } from 'rxjs/internal/observable/of';

describe('NgswUpdateService', () => {
  let service: NgswUpdateService;

  beforeEach(() => {
    const swUpdateMock = {
      isEnabled: false,
      versionUpdates: of(),
      activateUpdate: jasmine.createSpy('activateUpdate').and.returnValue(Promise.resolve(true))
    };
    const documentMock = {
      location: { reload: jasmine.createSpy('reload') }
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });
    service = TestBed.inject(NgswUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
