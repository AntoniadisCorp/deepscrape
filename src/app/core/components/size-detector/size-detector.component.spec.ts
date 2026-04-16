import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SizeDetectorComponent } from './size-detector.component';
import { getTestProviders } from 'src/app/testing';
import { WindowToken } from 'src/app/core/services/window.service';

describe('SizeDetectorComponent', () => {
  let component: SizeDetectorComponent;
  let fixture: ComponentFixture<SizeDetectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SizeDetectorComponent],
      providers: getTestProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(SizeDetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('has prefix "is-"', () => {
    expect(component.prefix).toBe('is-');
  });

  it('defines eight screen size breakpoints', () => {
    expect(component.sizes.length).toBe(8);
  });

  it('onResize() requests an animation frame via the window token', () => {
    const win = TestBed.inject(WindowToken);
    spyOn(win, 'requestAnimationFrame').and.returnValue(42);
    component.onResize();
    expect(win.requestAnimationFrame).toHaveBeenCalled();
  });

  it('onResize() cancels previous animation frame when one is pending', () => {
    const win = TestBed.inject(WindowToken);
    (component as any).animationFrameId = 9;
    const cancelSpy = spyOn(win, 'cancelAnimationFrame');
    spyOn(win, 'requestAnimationFrame').and.returnValue(10);

    component.onResize();

    expect(cancelSpy).toHaveBeenCalledWith(9);
  });

  it('onResize() callback invokes detectScreenSize', () => {
    const win = TestBed.inject(WindowToken);
    let resizeCallback: ((timestamp: number) => void) | null = null;
    spyOn(win, 'requestAnimationFrame').and.callFake((cb: any) => {
      resizeCallback = cb;
      return 1;
    });
    const detectSpy = spyOn<any>(component, 'detectScreenSize');

    component.onResize();
    expect(resizeCallback).toBeTruthy();

    if (resizeCallback) {
      (resizeCallback as any)(0);
    }
    expect(detectSpy).toHaveBeenCalled();
  });
});
