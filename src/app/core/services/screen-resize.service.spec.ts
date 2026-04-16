import { TestBed } from '@angular/core/testing';

import { ScreenResizeService } from './screen-resize.service';
import { getTestProviders } from 'src/app/testing';
import { SCREEN_SIZE } from '../enum';

describe('ScreenResizeService', () => {
  let service: ScreenResizeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.runInInjectionContext(() => new ScreenResizeService());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit resize events through observable', (done) => {
    service.onResize$.subscribe((size) => {
      expect(size).toBeDefined();
      done();
    });

    service.onResize(SCREEN_SIZE.SM);
  });

  it('should emit different screen sizes', () => {
    const sizes: SCREEN_SIZE[] = [];
    service.onResize$.subscribe((size) => sizes.push(size));

    service.onResize(SCREEN_SIZE.SM);
    service.onResize(SCREEN_SIZE.MD);

    expect(sizes).toEqual([SCREEN_SIZE.SM, SCREEN_SIZE.MD]);
  });

  it('should filter duplicate consecutive size values', (done) => {
    const sizes: SCREEN_SIZE[] = [];

    service.onResize$.subscribe((size) => {
      sizes.push(size);
    });

    service.onResize(SCREEN_SIZE.SM);
    service.onResize(SCREEN_SIZE.SM); // Duplicate
    service.onResize(SCREEN_SIZE.MD);

    setTimeout(() => {
      // Should not have the duplicate
      expect(sizes.filter((s) => s === SCREEN_SIZE.SM).length).toBeLessThanOrEqual(1);
      done();
    }, 100);
  });

  it('should update screen size dimensions', () => {
    const result = service.updateScreenSize();

    expect(result).toBeDefined();
    expect(result.screenWidth).toBeGreaterThan(0);
    expect(result.screenHeight).toBeGreaterThan(0);
  });

  it('should get fingerprint data with device info', () => {
    const fingerprint = service.getFingerprintData();

    expect(fingerprint).toBeDefined();
    expect(fingerprint.screenWidth).toBeGreaterThan(0);
    expect(fingerprint.screenHeight).toBeGreaterThan(0);
    expect(fingerprint.devicePixelRatio).toBeGreaterThan(0);
    expect(fingerprint.platform).toBeDefined();
    expect(fingerprint.userAgent).toBeDefined();
    expect(fingerprint.language).toBeDefined();
  });

  it('should maintain consistent device information', () => {
    const data = service.updateScreenSize();
    expect(data.screenWidth).toBeGreaterThan(0);
    expect(data.screenHeight).toBeGreaterThan(0);
    expect(typeof data.screenWidth).toBe('number');
    expect(typeof data.screenHeight).toBe('number');
  });

  it('should track screen changes with emit multiple sizes', () => {
    const sizes: SCREEN_SIZE[] = [];
    service.onResize$.subscribe((size) => sizes.push(size));

    service.onResize(SCREEN_SIZE.LG);
    service.onResize(SCREEN_SIZE.XL);

    expect(sizes).toEqual([SCREEN_SIZE.LG, SCREEN_SIZE.XL]);
  });
});
