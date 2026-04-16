import { TestBed } from '@angular/core/testing';
import { BrowserToken, browserProvider, Chrome } from './browser.service';
import { getTestProviders } from 'src/app/testing';

describe('BrowserService', () => {
  let originalChrome: any;

  beforeEach(() => {
    // Save the original `chrome` object if it exists
    originalChrome = (window as any).chrome;
  });

  afterEach(() => {
    // Restore the original `chrome` object after each test
    (window as any).chrome = originalChrome;
  });

  it('should provide chrome object when available', () => {
    const mockChrome = { runtime: { id: 'test' } };
    (window as any).chrome = mockChrome; // Mock the `chrome` object

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        {
          provide: BrowserToken,
          useFactory: browserProvider,
        },
      ],
    });

    const injectedChrome = TestBed.inject(BrowserToken);
    expect(injectedChrome).toEqual(mockChrome);

    (window as any).chrome = originalChrome;
  });

  it('should return undefined when chrome is not available', () => {
    (window as any).chrome = undefined;

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        {
          provide: BrowserToken,
          useFactory: browserProvider,
        },
      ],
    });

    const injectedChrome = TestBed.inject(BrowserToken);
    expect(injectedChrome).toBeUndefined();
  });
});