import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { LoadingService } from './loading.service';
import { getTestProviders } from 'src/app/testing';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with loading false', (done) => {
    service.isLoading().subscribe((isLoading) => {
      expect(isLoading).toBe(false);
      done();
    });
  });

  it('should start loading', (done) => {
    service.startLoading();
    service.isLoading().subscribe((isLoading) => {
      expect(isLoading).toBe(true);
      done();
    });
  });

  it('should stop loading', (done) => {
    service.startLoading();
    service.stopLoading();
    service.isLoading().subscribe((isLoading) => {
      expect(isLoading).toBe(false);
      done();
    });
  });

  it('should emit distinct values only', (done) => {
    const loadingStates: boolean[] = [];
    service.isLoading().subscribe((isLoading) => {
      loadingStates.push(isLoading);
    });

    service.startLoading();
    service.startLoading(); // Same value
    service.stopLoading();
    service.stopLoading(); // Same value

    setTimeout(() => {
      // Should not include duplicates due to distinctUntilChanged
      expect(loadingStates.length).toBeLessThan(5);
      done();
    }, 50);
  });

  it('should handle startAndStopLoading with immediate stop', fakeAsync(() => {
    const routine = jasmine.createSpy('routine').and.returnValue(true);

    service.startAndStopLoading(routine);
    tick(100);

    expect(routine).toHaveBeenCalled();
  }));

  it('should retry startAndStopLoading when routine returns false', fakeAsync(() => {
    let callCount = 0;
    const routine = jasmine.createSpy('routine').and.callFake(() => {
      callCount++;
      return callCount > 1; // Return false first time, true second time
    });

    service.startAndStopLoading(routine);
    tick(1500);

    expect(routine).toHaveBeenCalledTimes(2);
  }));
});
