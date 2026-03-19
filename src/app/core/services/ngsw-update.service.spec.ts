import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NgswUpdateService } from './ngsw-update.service';
import { SwUpdate } from '@angular/service-worker';

import { of } from 'rxjs/internal/observable/of';
import { getTestProviders } from 'src/app/testing';

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
        ...getTestProviders(),
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
