import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ApplicationRef, ElementRef, Injector, ViewContainerRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { TooltipDirective } from './tooltip.directive';
import { TooltipComponent } from '../components/tooltip/tooltip.component';
import { WindowToken } from '../services';
import { getTestProviders } from 'src/app/testing';

describe('TooltipDirective', () => {
  let hostElement: HTMLElement;
  let viewContainerRefSpy: jasmine.SpyObj<ViewContainerRef>;

  type TooltipInstance = {
    tooltip: string;
    position: string;
    left: number;
    top: number;
    setVisibility: jasmine.Spy;
  };

  type TooltipRefDouble = {
    location: { nativeElement: HTMLElement };
    instance: TooltipInstance;
    destroy: jasmine.Spy;
  };

  const createDirective = (): TooltipDirective => {
    const appRef = TestBed.inject(ApplicationRef);
    const injector = TestBed.inject(Injector);

    return TestBed.runInInjectionContext(
      () => new TooltipDirective(new ElementRef(hostElement), appRef, injector, viewContainerRefSpy)
    );
  };

  beforeEach(async () => {
    hostElement = document.createElement('div');
    hostElement.getBoundingClientRect = jasmine.createSpy().and.returnValue({
      left: 10,
      right: 110,
      top: 10,
      bottom: 30,
      width: 100,
      height: 20,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect);

    viewContainerRefSpy = jasmine.createSpyObj<ViewContainerRef>('ViewContainerRef', ['createComponent']);

    const tooltipElement = document.createElement('div');
    Object.defineProperty(tooltipElement, 'offsetWidth', { value: 140, configurable: true });
    Object.defineProperty(tooltipElement, 'offsetHeight', { value: 40, configurable: true });

    const componentRefMock: TooltipRefDouble = {
      location: { nativeElement: tooltipElement },
      instance: {
        tooltip: '',
        position: '',
        left: 0,
        top: 0,
        setVisibility: jasmine.createSpy('setVisibility'),
      },
      destroy: jasmine.createSpy('destroy'),
    };

    viewContainerRefSpy.createComponent.and.returnValue(componentRefMock as unknown as ReturnType<ViewContainerRef['createComponent']>);

    await TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: DOCUMENT, useValue: document },
        { provide: WindowToken, useValue: { innerWidth: 1200, innerHeight: 800 } },
      ],
    }).compileComponents();
  });

  it('should create an instance', () => {
    const directive = createDirective();
    expect(directive).toBeTruthy();
  });

  it('should create tooltip component on mouse enter', fakeAsync(() => {
    const directive = createDirective();

    directive.ngOnInit();
    directive.onMouseEnter(new MouseEvent('mouseenter'));
    tick(100);

    expect(viewContainerRefSpy.createComponent).toHaveBeenCalled();
    const latestArgs = viewContainerRefSpy.createComponent.calls.mostRecent().args;
    expect(latestArgs[0] as unknown).toBe(TooltipComponent as unknown);
  }));

  it('should destroy tooltip component on mouse leave after delay', fakeAsync(() => {
    const directive = createDirective();
    const destroySpy = jasmine.createSpy('destroy');

    (directive as unknown as { componentRef: TooltipRefDouble | null }).componentRef = {
      location: {
        nativeElement: document.createElement('div'),
      },
      instance: {
        tooltip: '',
        position: 'above',
        left: 0,
        top: 0,
        setVisibility: jasmine.createSpy('setVisibility'),
      },
      destroy: destroySpy,
    };
    document.body.appendChild((directive as unknown as { componentRef: TooltipRefDouble }).componentRef.location.nativeElement);

    directive.hideDelay = 0;
    directive.onMouseLeave();
    tick(0);

    expect(destroySpy).toHaveBeenCalled();
    expect((directive as unknown as { componentRef: TooltipRefDouble | null }).componentRef).toBeNull();
  }));

  it('should set tooltip content and coordinates on component', fakeAsync(() => {
    const directive = createDirective();
    directive.tooltip = 'Hello tooltip';
    directive.position = 'right';

    directive.ngOnInit();
    directive.onMouseEnter(new MouseEvent('mouseenter'));
    tick(100);

    const componentRef = (directive as unknown as { componentRef: TooltipRefDouble }).componentRef;
    expect(componentRef.instance.tooltip).toBe('Hello tooltip');
    expect(componentRef.instance.position).toBe('right');
    expect(componentRef.instance.left).toBeGreaterThanOrEqual(10);
    expect(componentRef.instance.top).toBeGreaterThanOrEqual(10);
  }));

  it('should cleanup on destroy', () => {
    const directive = createDirective();
    const destroySpy = jasmine.createSpy('destroy');

    (directive as unknown as { componentRef: TooltipRefDouble | null }).componentRef = {
      location: {
        nativeElement: document.createElement('div'),
      },
      instance: {
        tooltip: '',
        position: 'above',
        left: 0,
        top: 0,
        setVisibility: jasmine.createSpy('setVisibility'),
      },
      destroy: destroySpy,
    };
    document.body.appendChild((directive as unknown as { componentRef: TooltipRefDouble }).componentRef.location.nativeElement);

    directive.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect((directive as unknown as { componentRef: TooltipRefDouble | null }).componentRef).toBeNull();
  });
});
