import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageSrcsetDirective } from './image.srcset.directive';
import { ElementRef, Component } from '@angular/core';

@Component({
  template: '<img [dataSrcset]="imageUrl" [name]="name">',
})
class TestComponent {
  imageUrl = 'test.jpg';
  name: string | null = 'John Doe';
}

describe('ImageSrcsetDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let elementRef: ElementRef;
  let imgElement: HTMLImageElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestComponent],
      imports: [ImageSrcsetDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    elementRef = fixture.debugElement.nativeElement.firstChild;
    imgElement = elementRef as any;
  });

  it('should create an instance', () => {
    const directive = new ImageSrcsetDirective(elementRef);
    expect(directive).toBeTruthy();
  });

  it('should set srcset on ngAfterViewInit', () => {
    fixture.detectChanges();
    const directive = new ImageSrcsetDirective(elementRef);
    directive.ngOnInit()
    directive.ngAfterViewInit();
    expect(imgElement.srcset).toBe('test.jpg');
  });

  it('should handle error and set fallback image', () => {
    fixture.detectChanges();
    const directive = new ImageSrcsetDirective(elementRef);
    directive.ngOnInit()
    directive.ngAfterViewInit();

    // Spy on _handleError
    spyOn<any>(directive, '_handleError').and.callThrough();

    // Simulate an error event
    if (imgElement.onerror) {
      imgElement.onerror(new ErrorEvent('error'));
    }

    expect(directive['_handleError']).toHaveBeenCalled();
  });

  it('should clear onload and onerror on load', () => {
    fixture.detectChanges();
    const directive = new ImageSrcsetDirective(elementRef);
    directive.ngOnInit()
    directive.ngAfterViewInit();

    // Simulate onload event
    if (imgElement.onload)
      imgElement.onload(new Event('load'));

    expect(imgElement.onload).toBeNull();
    expect(imgElement.onerror).toBeNull();
  });

  it('should generate correct avatar URL', () => {
    fixture.detectChanges();
    const directive = new ImageSrcsetDirective(elementRef);
    directive.ngOnInit()
    directive.ngAfterViewInit();

    // Spy on _handleError
    spyOn<any>(directive, '_handleError').and.callThrough();

    // Simulate an error event
    if (imgElement.onerror)
      imgElement.onerror(new ErrorEvent('error'));
    const expectedUrl = `https://eu.ui-avatars.com/api/?name=J+D&size=250`
    expect(imgElement.srcset).toEqual(expectedUrl);
  });

  it('should use "NA" as default name if name is not provided', () => {
    fixture.detectChanges();
    const directive = new ImageSrcsetDirective(elementRef);
    component.name = null; // Set name to null

    directive.ngOnInit()
    directive.ngAfterViewInit();

    // Spy on _handleError
    spyOn<any>(directive, '_handleError').and.callThrough();

    // Simulate an error event
    if (imgElement.onerror)
      imgElement.onerror(new ErrorEvent('error'));
    const expectedUrl = `https://eu.ui-avatars.com/api/?name=N+A&size=250`
    expect(imgElement.srcset).toEqual(expectedUrl);
  });
});