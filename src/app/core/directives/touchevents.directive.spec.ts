import { ElementRef, Renderer2, ChangeDetectorRef } from '@angular/core';
import { TouchEventsDirective } from './touchevents.directive';
import { WindowToken } from '../services';
import { TestBed } from '@angular/core/testing';

describe('TouchEventsDirective', () => {
  let directive: TouchEventsDirective;
  let el: ElementRef;
  let renderer: Renderer2;
  let cdRef: ChangeDetectorRef;
  let windowMock: Window;

  beforeEach(() => {
    el = { nativeElement: document.createElement('div') } as ElementRef;
    renderer = jasmine.createSpyObj('Renderer2', ['listen', 'removeEventListener']);
    cdRef = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
    windowMock = { innerWidth: 1000, innerHeight: 800, addEventListener: () => { }, removeEventListener: () => { } } as any; // Mock window object

    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: el },
        { provide: Renderer2, useValue: renderer },
        { provide: ChangeDetectorRef, useValue: cdRef },
        { provide: WindowToken, useValue: windowMock },
      ],
    });

    directive = new TouchEventsDirective(
      TestBed.inject(ElementRef),
      TestBed.inject(Renderer2),
      TestBed.inject(ChangeDetectorRef)
    );

    // Override the injected WindowToken with the mock
    directive['window'] = windowMock;

    spyOn(el.nativeElement, 'addEventListener').and.callThrough();

  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should emit swipeLeft event', () => {
    const swipeLeftSpy = spyOn(directive.swipeLeft, 'emit');
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as any
      ]
    });
    directive.onTouchStartEvent(touchEvent);

    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 50, clientY: 100 } as any]
    });
    directive.onTouchMoveEvent(touchMoveEvent);

    // touchmove is debounced, so we need to wait
    setTimeout(() => {
      expect(swipeLeftSpy).toHaveBeenCalled();
    }, 20);
  });

  it('should emit swipeRight event', () => {
    const swipeRightSpy = spyOn(directive.swipeRight, 'emit');

    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 50, clientY: 100 } as any]
    });
    directive.onTouchStartEvent(touchEvent);

    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 100, clientY: 100 } as any]
    });
    directive.onTouchMoveEvent(touchMoveEvent);

    // touchmove is debounced, so we need to wait
    setTimeout(() => {
      expect(swipeRightSpy).toHaveBeenCalled();
    }, 20);
  });

  it('should call detectChanges on touchmove', (done) => {
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as any]
    });
    directive.onTouchStartEvent(touchEvent);

    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 50, clientY: 100 } as any]
    });
    directive.onTouchMoveEvent(touchMoveEvent);

    // touchmove is debounced, so we need to wait
    setTimeout(() => {
      expect(cdRef.detectChanges).toHaveBeenCalled();
      done();
    }, 20);
  });

  it('should reset directions on touch end', () => {
    const touchEvent = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 50, clientY: 100 } as any]
    });
    directive['lastDirectionX'] = 'left';
    directive['lastDirectionY'] = 'up';
    directive.onTouchEndEvent(touchEvent);

    expect(directive['lastDirectionX']).toBeNull();
    expect(directive['lastDirectionY']).toBeNull();
  });

  it('should remove event listeners on destroy', () => {

    directive.ngOnDestroy();

    expect(renderer.destroy).toHaveBeenCalledTimes(3);
  });
});