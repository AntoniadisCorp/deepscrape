import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
    selector: '[appRemoveToolbar]'
})
export class RemoveToolbarDirective implements OnInit {

    constructor(private el: ElementRef) { }

    ngOnInit(): void {
        const toolbarElements = this.el.nativeElement.querySelectorAll('.toolbar');
        toolbarElements.forEach((element: HTMLElement) => {
            element.remove();
        });
    }
}
