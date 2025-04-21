import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs/internal/Subscription';
import { slideInModalAnimation } from 'src/app/animations';
import { SCREEN_SIZE } from '../../enum';
import { ScreenResizeService } from '../../services';

@Component({
  selector: 'app-slideinmodal',
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

  private screenSub: Subscription
  private size!: SCREEN_SIZE
  private windowWidth: number
  protected fixedPosition: string = ''

  constructor(private resizeSvc: ScreenResizeService,) {
  }

  @Input() maxWidth?: string = 'max-w-lg'
  @Input() isOpen: FormControl<boolean>
  @Input() title: string = 'Add Menu item'
  @Input() position?: string = 'right'

  @Input() loading?: boolean = false

  @Input('hasBlur') hasBackdropBlur?: boolean = false

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    // this.fixedPosition = this.getPosition()
    // Subscribe to the Screen Resize event
    this.screenSub = this.resizeSvc.onResize$.subscribe((x: SCREEN_SIZE) => {

      const elementRef = this.modal.nativeElement as HTMLElement
      this.windowWidth = elementRef.offsetWidth / 2

      this.size = x
      console.log(this.size)

      if (this.size >= SCREEN_SIZE.SM) {
        this.setStyle()
      } else this.modal.nativeElement.style.left = "none"
    })
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    this.setStyle()
  }

  private setStyle() {

    const { screenWidth } = this.resizeSvc.updateScreenSize()
    if (screenWidth < 480)
      return


    const elementRef = this.modal.nativeElement as HTMLElement
    this.windowWidth = screenWidth >= 576 ? elementRef.offsetWidth / 2 : screenWidth / 2
    const rootFontSize = 16; // Assuming the root font size is 16px
    const leftCalculation = `calc(50% - ${this.windowWidth / rootFontSize}rem)`
    // console.log(`Modal ${elementRef.offsetWidth}`, screenWidth, this.windowWidth)
    this.modal.nativeElement.style.left = `${leftCalculation}`
  }

  protected getPosition() {

    const leftPosition = 'left-[calc(50%_-_16rem)]'
    console.log(leftPosition)

    switch (this.position) {
      case 'left':
        return 'top-28 left-[calc(0%)]'
      case 'right':
        return 'top-28'
      case 'bottom':
        return 'top-[calc(50%_+_112px)] xs:' + leftPosition
      case 'center':
        return 'top-28 xs:' + leftPosition
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
    this.screenSub?.unsubscribe()
  }
}
