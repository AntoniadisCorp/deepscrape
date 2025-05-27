import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, input, Input, model, output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs/internal/Subscription';
import { slideInModalAnimation } from 'src/app/animations';
import { SCREEN_SIZE } from '../../enum';
import { ScreenResizeService } from '../../services';
import { delay, map, of, Subject, take, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-slideinmodal',
  imports: [NgIf, MatProgressBarModule],
  templateUrl: './slide-in-modal.component.html',
  styleUrl: './slide-in-modal.component.scss',
  animations: [slideInModalAnimation],
})
export class SlideInModalComponent {


  @ViewChild('modal') modal: ElementRef<any>

  @HostListener('document:mousedown', ['$event'])
  onClick(event: MouseEvent): void {

    // console.log(`Modal mouse down ${this.modal?.nativeElement}`, event.target)
    if (this.modal && !this.modal.nativeElement.contains(event.target) && this.isOpen.value) {
      this.close()
    }
  }

  private screenSub: Subscription
  private destroy$ = new Subject<void>()
  private size!: SCREEN_SIZE
  private windowWidth: number
  protected fixedPosition: string = ''

  protected opened: boolean = false

  constructor(private resizeSvc: ScreenResizeService, private cdr: ChangeDetectorRef) {
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
    /* this.screenSub = this.resizeSvc.onResize$.subscribe((x: SCREEN_SIZE) => {

      const elementRef = this.modal.nativeElement as HTMLElement
      this.windowWidth = elementRef.offsetWidth / 2

      this.size = x
      console.log(this.size)

      if (this.size >= SCREEN_SIZE.SM) {
        // this.setStyle()
      } else this.modal.nativeElement.style.left = "none"
    }) */
    this.screenSub = this.isOpen.valueChanges.subscribe((value) => {
      this.opened = value
    })

  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    // this.setStyle()
  }

  /* private setStyle() {

    const { screenWidth } = this.resizeSvc.updateScreenSize()
    if (screenWidth < 480)
      return


    const elementRef = this.modal.nativeElement as HTMLElement
    this.windowWidth = screenWidth >= 576 ? elementRef.offsetWidth / 2 : screenWidth / 2
    const rootFontSize = 16; // Assuming the root font size is 16px
    const leftCalculation = `50%`// `calc(50% - ${this.windowWidth / rootFontSize}rem)`
    // console.log(`Modal ${elementRef.offsetWidth}`, screenWidth, this.windowWidth)
    this.modal.nativeElement.style.left = `${leftCalculation}`
  } */

  protected getPosition() {

    const leftPosition = 'left-[50%]'
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
    of(false).pipe(
      takeUntil(this.destroy$),
      map((value) => this.opened = value),
      // Emit false after a delay of 300ms
      delay(300), // Delay for the animation to finish
      take(1) // Take only the first emission
    ).subscribe(
      {
        next: (value: boolean) => {
          this.isOpen.setValue(value, { emitModelToViewChange: false })
        },
        error: (err) => {
          this.isOpen.setValue(false, { emitModelToViewChange: false })
          this.opened = false
          console.error(err)
        },
        complete: () => {
          this.cdr.detectChanges()
        }
      }
    )
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.hasBackdropBlur = false
    this.destroy$.next()
    this.destroy$.complete()
    this.screenSub?.unsubscribe()
  }
}
