import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HiddenDragScrollDirective } from './hidden-drag-scroll.directive';

// Test host component
@Component({
  template: `<div
    class="test-container overflow-x-hidden"
    appHiddenDragScroll
    [scrollSpeed]="2.0"
    style="width: 200px; white-space: nowrap;">
    <div class="content" style="width: 1000px;">Long scrollable content</div>
  </div>`
})
class TestHostComponent {}

describe('HiddenDragScrollDirective', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let directiveEl: DebugElement;
  let directiveInstance: HiddenDragScrollDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestHostComponent, HiddenDragScrollDirective]
    });

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    directiveEl = fixture.debugElement.query(By.directive(HiddenDragScrollDirective));
    directiveInstance = directiveEl.injector.get(HiddenDragScrollDirective);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(directiveInstance).toBeTruthy();
  });

  it('should have default scrollSpeed set to 2.0', () => {
    expect(directiveInstance.scrollSpeed).toBe(2.0);
  });

  // Add more tests for mouse and touch events if needed
});
