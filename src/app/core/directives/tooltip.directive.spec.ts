import { ComponentFixture, TestBed, ComponentFixtureAutoDetect } from '@angular/core/testing';
import { TooltipDirective } from './tooltip.directive';
import { ElementRef, ApplicationRef, Injector, ViewContainerRef, Component } from '@angular/core';
import { TooltipComponent } from '../components/tooltip/tooltip.component';
import { WindowToken } from '../services';

// Create a dummy component to host the directive
@Component({
  template: '<div tooltip="Test tooltip"></div>',
})
class TestComponent { }

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let testComponent: TestComponent;
  let elementRef: ElementRef;
  let applicationRef: any;
  let injector: any;
  let viewContainerRef: any;
  let windowMock: Window;

  beforeEach(() => {
    applicationRef = jasmine.createSpyObj('ApplicationRef', ['attachView', 'detachView']);
    injector = jasmine.createSpyObj('Injector', ['get']);
    viewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['createComponent', 'element']);
    windowMock = jasmine.createSpyObj('window', ['setTimeout', 'clearTimeout']);

    TestBed.configureTestingModule({
      declarations: [TestComponent],
      imports: [TooltipDirective], // Import the standalone directive
      providers: [
        { provide: ApplicationRef, useValue: applicationRef },
        { provide: Injector, useValue: injector },
        { provide: ViewContainerRef, useValue: viewContainerRef },
        { provide: WindowToken, useValue: windowMock },
        { provide: ComponentFixtureAutoDetect, useValue: true }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    testComponent = fixture.componentInstance;
    elementRef = fixture.debugElement.nativeElement.firstChild;

    // Mock elementRef.nativeElement.getBoundingClientRect()
    elementRef.nativeElement.getBoundingClientRect = jasmine.createSpy().and.returnValue({
      left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20
    });
  });

  it('should create an instance', () => {
    const directive = new TooltipDirective(viewContainerRef);
    expect(directive).toBeTruthy();
  });

  it('should create tooltip component on mouseenter', () => {
    const directive = new TooltipDirective(viewContainerRef);
    const createComponentSpy = viewContainerRef.createComponent as jasmine.Spy;

    directive.ngOnInit()
    elementRef.nativeElement.dispatchEvent(new Event('mouseenter'));

    //Wait for debounce time to complete
    setTimeout(() => {
      expect(createComponentSpy).toHaveBeenCalledWith(TooltipComponent);
    }, 100);

  });

  it('should destroy tooltip component on mouseleave', () => {
    const directive = new TooltipDirective(viewContainerRef);
    const destroySpy = jasmine.createSpy('destroy');
    const clearTimeoutSpy = windowMock.clearTimeout as jasmine.Spy;

    // Mock componentRef and its methods
    directive['componentRef'] = {
      destroy: destroySpy,
    } as any;
    directive.hideDelay = 0; // Set hideDelay to 0 for immediate destruction

    directive.onMouseLeave();
    //Wait for debounce time to complete
    setTimeout(() => {
      expect(destroySpy).toHaveBeenCalled();
      expect(directive['componentRef']).toBeNull();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    }, 0);
  });

  it('should set tooltip text and position to tooltip component', () => {
    const directive = new TooltipDirective(viewContainerRef);
    const tooltipText = 'Test tooltip text';
    const tooltipPosition = 'right';
    directive.tooltip = tooltipText
    directive['componentRef'] = {
      instance: {
        tooltip: '',
        position: '',
        left: 0,
        top: 0,
        visible: false,
      },
    } as any;
    directive.position = tooltipPosition

    directive.ngOnInit()
    elementRef.nativeElement.dispatchEvent(new Event('mouseenter'));
    //Wait for debounce time to complete
    setTimeout(() => {
      directive.setTooltipComponentProperties();
      expect(directive['componentRef'].instance.tooltip).toBe(tooltipText);
      expect(directive['componentRef'].instance.position).toBe(tooltipPosition);
    }, 100);
  });

  it('should destroy the component on ngOnDestroy', () => {
    const directive = new TooltipDirective(viewContainerRef);
    const destroySpy = jasmine.createSpy('destroy');

    // Mock componentRef and its methods
    directive['componentRef'] = {
      destroy: destroySpy,
    } as any;
    directive.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(directive['componentRef']).toBeNull();
  });
});