import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Outsideclick } from './outsideclick.directive';
import { ElementRef, Component } from '@angular/core';

@Component({
  template: '<div appOutsideClick (outsideClick)="handleClick()"></div>',
  standalone: true
})
class TestComponent {
  handleClick() { }
}

describe('OutsideclickDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let elementRef: ElementRef;
  let directive: Outsideclick;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Outsideclick, TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    elementRef = fixture.debugElement.nativeElement.firstChild;
    directive = new Outsideclick(elementRef);
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should emit outsideClick event when clicked outside the element', fakeAsync(() => {
    const handleClickSpy = spyOn(component, 'handleClick');
    const event = new MouseEvent('mousedown', { bubbles: true });
    document.dispatchEvent(event);
    tick();
    fixture.detectChanges();
    expect(handleClickSpy).toHaveBeenCalled();
  }));

  it('should not emit outsideClick event when clicked inside the element', fakeAsync(() => {
    const handleClickSpy = spyOn(component, 'handleClick');
    const event = new MouseEvent('mousedown', { bubbles: true });
    elementRef.nativeElement.dispatchEvent(event);
    tick();
    fixture.detectChanges();
    expect(handleClickSpy).not.toHaveBeenCalled();
  }));
});