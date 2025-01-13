import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

@Directive({

  selector: '[appRemoveClass]',
  standalone: true
})
export class RemoveClassDirective implements OnChanges {
  @Input() appRemoveClass: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnChanges() {
    if (this.appRemoveClass) {
      this.renderer.removeClass(this.el.nativeElement, this.appRemoveClass);
    }
  }
}