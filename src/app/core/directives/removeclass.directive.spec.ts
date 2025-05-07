import { ElementRef, Renderer2 } from '@angular/core';
import { RemoveClassDirective } from './removeclass.directive';

describe('RemoveClassDirective', () => {
  let directive: RemoveClassDirective;
  let el: ElementRef;
  let renderer: Renderer2;

  beforeEach(() => {
    // Mock ElementRef
    el = {
      nativeElement: document.createElement('div')
    };

    // Mock Renderer2
    renderer = jasmine.createSpyObj('Renderer2', ['removeClass']);

    directive = new RemoveClassDirective(el, renderer);
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should remove the class when appRemoveClass input changes', () => {
    const className = 'test-class';
    directive.appRemoveClass = className;
    directive.ngOnChanges();
    expect(renderer.removeClass).toHaveBeenCalledWith(el.nativeElement, className);
  });

  it('should not remove the class if appRemoveClass is empty', () => {
    directive.appRemoveClass = '';
    directive.ngOnChanges();
    expect(renderer.removeClass).not.toHaveBeenCalled();
  });
});