import { ChangeDetectorRef, Directive, ElementRef, EventEmitter, HostListener, inject, Input, Output, Renderer2 } from '@angular/core'
import { ScrollDimensions } from '../types'
import { Subject } from 'rxjs/internal/Subject'
import { debounceTime } from 'rxjs/internal/operators/debounceTime'
import { windowTime } from 'rxjs'
import { WindowToken } from '../services'

@Directive({
  selector: '[appTouchEvents]',

})
export class TouchEventsDirective {

  private window: Window = inject(WindowToken)
  private deltaX = 0
  private deltaY = 0

  private lastTouchX: number = 0
  private lastTouchY: number = 0

  private lastDirectionX: 'left' | 'right' | null = null; // Last detected direction
  private lastDirectionY: 'up' | 'down' | null = null; // Last detected direction
  private sensitivityX: number = 1.5 // Sensitivity for movement
  private sensitivityY: number = 1.5 // Sensitivity for movement

  private touchMoveSubject: Subject<any> = new Subject() // RxJS Subject to debounce touch moves


  private touchStartListener: () => void

  private touchMoveListener: () => void
  private touchEndListener: () => void

  @Output() swipeLeft = new EventEmitter<ScrollDimensions>()
  @Output() swipeRight = new EventEmitter<ScrollDimensions>()

  @Output() onMove = new EventEmitter<ScrollDimensions>()

  constructor(private el: ElementRef, private renderer: Renderer2, private cdRef: ChangeDetectorRef) {
    this.touchStartListener = this.addPassiveTouchStartListener()
    this.touchMoveListener = this.addPassiveTouchMoveListener()
    this.touchEndListener = this.addPassiveTouchEndListener()

    // Throttle touchmove events to every 16ms (~60fps)
    this.touchMoveSubject.pipe(debounceTime(16)).subscribe(() => {
      this.cdRef.detectChanges() // Manually trigger change detection
    })
  }

  private addPassiveTouchStartListener(): () => void {
    // Add passive touchstart event listener
    const handlerStart = this.onTouchStartEvent.bind(this)
    const element = this.el.nativeElement as HTMLElement
    element.addEventListener('touchstart', handlerStart, { passive: true, capture: true })
    return () => element.removeEventListener('touchstart', handlerStart)
  }

  private addPassiveTouchMoveListener(): () => void {
    // Add passive touchmove event listener
    const handlerMove = this.onTouchMoveEvent.bind(this)

    const element = this.el.nativeElement as HTMLElement
    element.addEventListener('touchmove', handlerMove, { passive: true, capture: true })

    // Return a cleanup function to remove the event listener
    return () => element.removeEventListener('touchmove', handlerMove)
  }

  private addPassiveTouchEndListener(): () => void {
    // Add passive touchend event listener
    const handlerEnd = this.onTouchEndEvent.bind(this)
    const element = this.el.nativeElement as HTMLElement
    element.addEventListener('touchend', handlerEnd, { passive: true, capture: true })
    return () => element.removeEventListener('touchend', handlerEnd)
  }

  // @HostListener('touchstart', ['$event'])
  onTouchStartEvent(event: TouchEvent) {

    const touch = event.touches[0];

    this.lastTouchX = touch.clientX
    this.lastTouchY = touch.clientX

    // Optionally reset or handle after touch starts
    this.lastDirectionX = null // Reset direction when touch ends
    this.lastDirectionY = null // Reset direction when touch ends

  }

  // @HostListener('touchmove', ['$event',])
  onTouchMoveEvent(event: TouchEvent) {
    const touch = event.touches[0]

    const currentTouchX = touch.clientX
    const currentTouchY = touch.clientY

    const deltaX = currentTouchX - this.lastTouchX
    const deltaY = currentTouchY - this.lastTouchY

    // Only update if the movement is significant enough
    if (Math.abs(deltaX) > 4) {

      const normalizedDeltaX = (deltaX / this.window.innerWidth * this.sensitivityX) * 100
      // Emit the swipe event with the calculated step size
      const stepSizeX = Math.abs(deltaX) * normalizedDeltaX // Adjust step scaling factor

      // Determine the direction of movement (left or right)
      let currentDirection: 'left' | 'right' | null = null

      if (deltaX > 0) {
        currentDirection = 'right'
      } else if (deltaX < 0) {
        currentDirection = 'left'
      }

      // Ensure the direction is stable before updating the direction
      if (this.lastDirectionX !== currentDirection)
        this.lastDirectionX = currentDirection

      if (currentDirection === 'right') {
        this.swipeRight.emit({ deltaX: stepSizeX, deltaY: this.deltaY })
      } else if (currentDirection === 'left') {
        this.swipeLeft.emit({ deltaX: stepSizeX, deltaY: this.deltaY })
      }

      // Update last touch position for next movement calculation
      this.lastTouchX = currentTouchX

      // Emit an event to notify of a move and trigger change detection
      this.touchMoveSubject.next(currentTouchX)

    }


    if (Math.abs(deltaY) > 4) {
      const normalizedDeltaX = (deltaY / this.window.innerHeight * this.sensitivityY) * 100
      const stepSizeY = Math.abs(deltaY) * normalizedDeltaX // Adjust step scaling factor

      // Determine the direction of movement (left or right)
      let currentDirectionY: 'up' | 'down' | null = null


      if (deltaY > 0) {
        currentDirectionY = 'up'
      } else if (deltaY < 0) {
        currentDirectionY = 'down'
      }

      // Ensure the direction is stable before updating the direction
      if (this.lastDirectionY !== currentDirectionY)
        this.lastDirectionY = currentDirectionY

      if (currentDirectionY === 'up') {
        // this.swipeUp.emit({ deltaX: stepSizeX, deltaY: this.deltaY })
      } else if (currentDirectionY === 'down') {
        // this.swipeDown.emit({ deltaX: stepSizeX, deltaY: this.deltaY })
      }

      // Update last touch position for next movement calculation
      this.lastTouchY = currentTouchY

      // Emit an event to notify of a move and trigger change detection
      this.touchMoveSubject.next(currentTouchY)
    }




    // this.onMove.emit({ deltaX: this.deltaX, deltaY: this.deltaY })


  }



  // @HostListener('touchend', ['$event'])
  onTouchEndEvent(event: TouchEvent) {
    const touch = event.changedTouches[0]
    const endX = touch.clientX
    const endY = touch.clientY
    const deltaX = endX - this.lastTouchX
    const deltaY = endY - this.lastTouchY

    this.lastTouchX = 0
    this.lastTouchY = 0

    // Optionally reset or handle after touch ends
    this.lastDirectionX = null // Reset direction when touch ends
    this.lastDirectionY = null // Reset direction when touch ends

    /* if (deltaX < -5) {
      // this.swipeLeft.emit({ deltaX: this.deltaX, deltaY: this.deltaY })
    } else if (deltaX > 5) {
      // this.swipeRight.emit({ deltaX: this.deltaX, deltaY: this.deltaY })
    }

    if (deltaY < -5) {
      // this.swipeDown.emit({ deltaX: this.deltaX, deltaY: this.deltaY })
    } else if (deltaY > 5) {
      // this.swipeUp.emit({ deltaX: this.deltaX, deltaY: this.deltaY })
    } */

  }

  ngOnDestroy(): void {

    if (this.touchStartListener)
      this.touchStartListener()

    if (this.touchMoveListener)
      this.touchMoveListener()

    if (this.touchEndListener)
      this.touchEndListener()
  }


}
