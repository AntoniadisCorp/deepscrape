import { NgClass, NgIf } from '@angular/common';
import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { slideInModalAnimation } from 'src/app/animations';

@Component({
  selector: 'app-slideinmodal',
  standalone: true,
  imports: [NgClass, NgIf, MatProgressBarModule],
  templateUrl: './slide-in-modal.component.html',
  styleUrl: './slide-in-modal.component.scss',
  animations: [slideInModalAnimation]
})
export class SlideInModalComponent {


  @ViewChild('modal') modal: ElementRef<any>

  @HostListener('document:mousedown', ['$event'])
  onClick(event: MouseEvent): void {

    // console.log(`Modal mouse down ${this.modal?.nativeElement}`, event.target)
    if (this.modal && !this.modal.nativeElement.contains(event.target) && this.isOpen) {
      this.close()
    }
  }

  constructor() {

  }

  @Input() isOpen: FormControl<boolean>
  @Input() title: string = 'Add Menu item'
  @Input() position?: string = 'right'

  @Input() loading?: boolean = false

  @Input('hasBlur') hasBackdropBlur?: boolean = false



  protected getPosition() {

    switch (this.position) {
      case 'left':
        return 'top-28 left-[calc(0%)]'
      case 'right':
        return 'top-28'
      case 'bottom':
        return 'top-[calc(50%_+_112px)] xs:left-[calc(50%_-_16rem)]'
      case 'center':
        return 'top-28 xs:left-[calc(50%_-_16rem)]'
      default:
        return 'top-28'
    }
  }
  close() {
    this.isOpen.setValue(false);
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.hasBackdropBlur = false
  }
}
