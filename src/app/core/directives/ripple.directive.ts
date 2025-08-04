import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, HostListener, Inject, Input } from '@angular/core';
import { Subject } from 'rxjs/internal/Subject';


type Color = `${string}`;

@Directive({
  selector: '[appRipple]',

})
export class RippleDirective {
  @Input() rippleColor: 'light' | 'dark' | Color = 'light';

  private ripple: Ripple;
  private focusedRippleElement: HTMLSpanElement | null = null;
  private mouseDown$ = new Subject<MouseEvent | null>();

  constructor(private el: ElementRef, @Inject(DOCUMENT) private document: Document) {
    this.ripple = new Ripple(this.document);
    this.el.nativeElement.style.position = 'relative';
    this.el.nativeElement.style.overflow = 'hidden';
  }

  @HostListener('mouseup', ['$event'])
  onClick(event: MouseEvent) {
    const delay = 200;
    setTimeout(() => {

      if (this.focusedRippleElement) this.focusedRippleElement?.remove()
      this.el.nativeElement.querySelectorAll('.ripple').forEach((element: any) => this.el.nativeElement.removeChild(element))

    }, delay);
  }

  @HostListener('mousedown', ['$event'])
  onFocus(event: MouseEvent) {

    /* this.mouseDown$.pipe(
      debounceTime(200),
      filter(event => !!event),
      tap(event => {
       
      })
    ).subscribe();
    this.mouseDown$.next(event); */
    if (!this.focusedRippleElement) {
      const circle = this.ripple.create(event, this.el.nativeElement, this.rippleColor);
      this.focusedRippleElement = circle;
    }
    this.focusedRippleElement = null

  }

  @HostListener('mouseleave', ['$event'])
  onBlur() {
    if (this.focusedRippleElement) this.focusedRippleElement?.remove()
    this.el.nativeElement.querySelectorAll('.ripple').forEach((element: any) => this.el.nativeElement.removeChild(element))
    this.focusedRippleElement = null;
    // this.mouseDown$.next(null);
  }
}

// Add your Ripple class logic from the script
class Ripple {
  x = 0;
  y = 0;
  z = 0;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
  findFurthestPoint(clickPointX: number, elementWidth: number, offsetX: number, clickPointY: number, elementHeight: number, offsetY: number): number {
    this.x = clickPointX - offsetX > elementWidth / 2 ? 0 : elementWidth;
    this.y = clickPointY - offsetY > elementHeight / 2 ? 0 : elementHeight;
    this.z = Math.hypot(this.x - (clickPointX - offsetX), this.y - (clickPointY - offsetY));
    return this.z;
  }

  appyStyles(element: HTMLElement, color: string, rect: DOMRect, radius: number, event: MouseEvent): void {
    element.classList.add('ripple');
    element.style.backgroundColor = color === 'dark' ? 'rgba(0,0,0, 0.2)' : color === 'light' ? 'rgba(255,255,255, 0.3)' : color;
    element.style.borderRadius = '50%';
    element.style.pointerEvents = 'none';
    element.style.position = 'absolute';
    element.style.left = `${event.clientX - rect.left - radius}px`;
    element.style.top = `${event.clientY - rect.top - radius}px`;
    element.style.width = element.style.height = `${radius * 2}px`;
  }

  applyAnimation(element: HTMLElement): void {
    element.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], {
      duration: 500,
      easing: 'linear',
    });
  }

  create(event: MouseEvent, element: HTMLElement, color: string): HTMLSpanElement | null {
    // const element = event.currentTarget as HTMLElement;
    if (!element?.getBoundingClientRect()) {
      console.error('The element does not support getBoundingClientRect. Make sure it is a valid DOM element.');
      return null
    }
    const rect = element?.getBoundingClientRect()
    const radius = this.findFurthestPoint(event.clientX, element.offsetWidth, rect.left, event.clientY, element.offsetHeight, rect.top);
    const circle = this.document.createElement('span');
    this.appyStyles(circle, color, rect, radius, event);
    this.applyAnimation(circle);
    element.appendChild(circle);
    return circle
  }
}
