import { ElementRef } from '@angular/core';
import { RippleDirective } from './ripple.directive';

describe('RippleDirective', () => {
  let directive: RippleDirective;
  let mockElementRef: ElementRef;
  let mockDocument: Document;
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    mockElementRef = { nativeElement: element };
    mockDocument = document;
    directive = new RippleDirective(mockElementRef as ElementRef, mockDocument);
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should set position and overflow styles on the element', () => {
    expect(element.style.position).toBe('relative');
    expect(element.style.overflow).toBe('hidden');
  });

  it('should create a ripple on mousedown', () => {
    const event = new MouseEvent('mousedown', { clientX: 0, clientY: 0 });
    spyOn(directive['ripple'], 'create').and.callThrough();
    directive.onFocus(event);
    expect(directive['ripple'].create).toHaveBeenCalled();
  });

  it('should remove ripples on mouseup', () => {
    const event = new MouseEvent('mouseup');
    const rippleElement = document.createElement('span');
    rippleElement.classList.add('ripple');
    element.appendChild(rippleElement);
    directive.onClick(event);
    setTimeout(() => {
      expect(element.querySelector('.ripple')).toBeNull();
    }, 200);
  });

  it('should remove ripples on mouseleave', () => {
    const rippleElement = document.createElement('span');
    rippleElement.classList.add('ripple');
    element.appendChild(rippleElement);
    directive.onBlur();
    expect(element.querySelector('.ripple')).toBeNull();
  });
});