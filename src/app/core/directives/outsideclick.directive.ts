import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appOutsideClick]',

})
export class Outsideclick {

  @Output()
  outsideClick: EventEmitter<MouseEvent> = new EventEmitter();

  @HostListener('document:mousedown', ['$event'])
  onClick(event: MouseEvent): void {

    // console.log(`mouse down ${this.elementRef.nativeElement}`, event.target)
    if (event.target !== this.elementRef.nativeElement && !this.elementRef.nativeElement.contains(event.target)) {
      this.outsideClick.emit(event)
    }
  }

  constructor(private elementRef: ElementRef) { }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
  }

}
