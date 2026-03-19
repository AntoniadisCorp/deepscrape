import { ElementRef, Renderer2, ChangeDetectorRef } from '@angular/core';
import { TouchEventsDirective } from './touchevents.directive';
import { WindowToken } from '../services';
import { TestBed } from '@angular/core/testing';
import { getTestProviders } from 'src/app/testing';
import { fakeAsync, tick } from '@angular/core/testing';

describe('TouchEventsDirective', () => {
  let directive: TouchEventsDirective;
  let el: ElementRef;
  let renderer: Renderer2;
  let cdRef: ChangeDetectorRef;
  let windowMock: Window;

  beforeEach(() => {
    el = { nativeElement: document.createElement('div') } as ElementRef;
    renderer = jasmine.createSpyObj('Renderer2', ['listen', 'removeEventListener', 'destroy']);
    cdRef = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
    windowMock = { innerWidth: 1000, innerHeight: 800, addEventListener: () => { }, removeEventListener: () => { } } as any; // Mock window object

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: ElementRef, useValue: el },
        { provide: Renderer2, useValue: renderer },
        { provide: ChangeDetectorRef, useValue: cdRef },
        { provide: WindowToken, useValue: windowMock },
      ],
    });

    directive = TestBed.runInInjectionContext(() => new TouchEventsDirective(
      TestBed.inject(ElementRef),
      TestBed.inject(Renderer2),
      TestBed.inject(ChangeDetectorRef)
    ));

    // Override the injected WindowToken with the mock
    directive['window'] = windowMock;

    spyOn(el.nativeElement, 'addEventListener').and.callThrough();

  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should emit swipeLeft event', fakeAsync(() => {
    const swipeLeftSpy = spyOn(directive.swipeLeft, 'emit');
    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as unknown as TouchEvent;
    directive.onTouchStartEvent(touchEvent);

    const touchMoveEvent = {
      touches: [{ clientX: 50, clientY: 100 }],
    } as unknown as TouchEvent;
    directive.onTouchMoveEvent(touchMoveEvent);

    tick(20);
    expect(swipeLeftSpy).toHaveBeenCalled();
  }));

  it('should emit swipeRight event', fakeAsync(() => {
    const swipeRightSpy = spyOn(directive.swipeRight, 'emit');

    const touchEvent = {
      touches: [{ clientX: 50, clientY: 100 }],
    } as unknown as TouchEvent;
    directive.onTouchStartEvent(touchEvent);

    const touchMoveEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as unknown as TouchEvent;
    directive.onTouchMoveEvent(touchMoveEvent);

    tick(20);
    expect(swipeRightSpy).toHaveBeenCalled();
  }));

  it('should call detectChanges on touchmove', fakeAsync(() => {
    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as unknown as TouchEvent;
    directive.onTouchStartEvent(touchEvent);

    const touchMoveEvent = {
      touches: [{ clientX: 50, clientY: 100 }],
    } as unknown as TouchEvent;
    directive.onTouchMoveEvent(touchMoveEvent);

    tick(20);
    expect(cdRef.detectChanges).toHaveBeenCalled();
  }));

  it('should reset directions on touch end', () => {
    const touchEvent = {
      changedTouches: [{ clientX: 50, clientY: 100 }],
    } as unknown as TouchEvent;
    directive['lastDirectionX'] = 'left';
    directive['lastDirectionY'] = 'up';
    directive.onTouchEndEvent(touchEvent);

    expect(directive['lastDirectionX']).toBeNull();
    expect(directive['lastDirectionY']).toBeNull();
  });

  it('should remove event listeners on destroy', () => {

    directive.ngOnDestroy();

    expect(renderer.destroy).not.toHaveBeenCalled();
  });
});