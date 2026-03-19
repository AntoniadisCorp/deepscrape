import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TooltipDirective } from './tooltip.directive';
import { ElementRef, ApplicationRef, Injector, ViewContainerRef, Component } from '@angular/core';
import { TooltipComponent } from '../components/tooltip/tooltip.component';
import { WindowToken } from '../services';
import { DOCUMENT } from '@angular/common';
import { getTestProviders } from 'src/app/testing';

// Create a dummy component to host the directive
@Component({
  standalone: true,
  imports: [TooltipDirective],
  template: '<div tooltip="Test tooltip"></div>',
})
class TestComponent { }

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let elementRef: ElementRef;
  let injector: any;
  let viewContainerRef: any;
  let windowMock: Pick<Window, 'innerWidth' | 'innerHeight'>;
  let documentMock: Document;

  const createDirective = (): TooltipDirective =>
    TestBed.runInInjectionContext(() => new TooltipDirective(elementRef, TestBed.inject(ApplicationRef), injector, viewContainerRef));

  beforeEach(() => {
    injector = jasmine.createSpyObj('Injector', ['get']);
    viewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['createComponent']);

    const tooltipNativeElement = {
      classList: { add: jasmine.createSpy('add') },
      style: { visibility: '', display: '', position: '' },
      offsetWidth: 140,
      offsetHeight: 40,
      parentNode: { removeChild: jasmine.createSpy('removeChild') },
    } as any;

    const componentRefMock = {
      location: { nativeElement: tooltipNativeElement },
      instance: {
        tooltip: '',
        position: '',
        left: 0,
        top: 0,
        setVisibility: jasmine.createSpy('setVisibility'),
      },
      destroy: jasmine.createSpy('destroy'),
    };

    (viewContainerRef.createComponent as jasmine.Spy).and.returnValue(componentRefMock);

    windowMock = {
      innerWidth: 1200,
      innerHeight: 800,
    };

    documentMock = {
      body: {
        appendChild: jasmine.createSpy('appendChild'),
      },
    } as unknown as Document;

    TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        ...getTestProviders(),
        { provide: Injector, useValue: injector },
        { provide: ViewContainerRef, useValue: viewContainerRef },
        { provide: WindowToken, useValue: windowMock },
        { provide: DOCUMENT, useValue: documentMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    // Wrap the raw DOM node in an ElementRef so the directive constructor receives
    // an object with a `.nativeElement` property, matching Angular's DI contract.
    const hostEl = fixture.debugElement.nativeElement.firstChild as HTMLElement;
    elementRef = new ElementRef(hostEl);

    // Mock elementRef.nativeElement.getBoundingClientRect()
    elementRef.nativeElement.getBoundingClientRect = jasmine.createSpy().and.returnValue({
      left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20
    });
  });

  it('should create an instance', () => {
    const directive = createDirective();
    expect(directive).toBeTruthy();
  });

  it('should create tooltip component on mouseenter', fakeAsync(() => {
    const directive = createDirective();
    const createComponentSpy = viewContainerRef.createComponent as jasmine.Spy;

    directive.ngOnInit();
    elementRef.nativeElement.dispatchEvent(new Event('mouseenter'));
    tick(100);

    expect(createComponentSpy).toHaveBeenCalledWith(TooltipComponent);
  }));

  it('should destroy tooltip component on mouseleave after delay', fakeAsync(() => {
    const directive = createDirective();
    const destroySpy = jasmine.createSpy('destroy');

    // Mock componentRef and its methods
    directive['componentRef'] = {
      location: {
        nativeElement: {
          parentNode: { removeChild: jasmine.createSpy('removeChild') },
        },
      },
      instance: { setVisibility: jasmine.createSpy('setVisibility') },
      destroy: destroySpy,
    } as any;
    directive.hideDelay = 0; // Set hideDelay to 0 for immediate destruction

    directive.onMouseLeave();
    tick(0);

    expect(destroySpy).toHaveBeenCalled();
    expect(directive['componentRef']).toBeNull();
  }));

  it('should set tooltip text and position to tooltip component', () => {
    const directive = createDirective();
    const tooltipText = 'Test tooltip text';
    const tooltipPosition = 'right';
    directive.tooltip = tooltipText;
    directive['componentRef'] = {
      instance: {
        tooltip: '',
        position: '',
        left: 0,
        top: 0,
        setVisibility: jasmine.createSpy('setVisibility'),
      },
      location: {
        nativeElement: {
          classList: { add: jasmine.createSpy('add') },
          style: { visibility: '', display: '', position: '' },
          offsetWidth: 140,
          offsetHeight: 40,
          parentNode: { removeChild: jasmine.createSpy('removeChild') },
        },
      },
    } as any;
    directive.position = tooltipPosition;

    directive.setTooltipComponentProperties();
    expect(directive['componentRef'].instance.tooltip).toBe(tooltipText);
    expect(directive['componentRef'].instance.position).toBe(tooltipPosition);
  });

  it('should destroy the component on ngOnDestroy', () => {
    const directive = createDirective();
    const destroySpy = jasmine.createSpy('destroy');

    // Mock componentRef and its methods
    directive['componentRef'] = {
      location: {
        nativeElement: {
          parentNode: { removeChild: jasmine.createSpy('removeChild') },
        },
      },
      destroy: destroySpy,
    } as any;
    directive.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(directive['componentRef']).toBeNull();
  });
});