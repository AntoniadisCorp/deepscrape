import { TestBed } from '@angular/core/testing';

import { WindowToken, windowProvider } from './window.service';
import { getTestProviders } from 'src/app/testing';

describe('WindowService', () => {
  let windowObj: Window;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        {
          provide: WindowToken,
          useFactory: windowProvider,
        },
      ],
    });
    windowObj = TestBed.inject(WindowToken);
  });

  it('should be created', () => {
    expect(windowObj).toBeTruthy();
  });

  it('should return the native window object', () => {
    expect(windowObj).toBe(window);
  });
});