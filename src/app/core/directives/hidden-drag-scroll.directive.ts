import { Directive, ElementRef, HostListener, Input, OnDestroy, OnInit, NgZone } from '@angular/core';

/**
 * A directive to enable drag scrolling on elements with overflow-x-hidden
 * Specifically designed to work with hidden overflow containers
 */
@Directive({
  selector: '[appHiddenDragScroll]'
})
export class HiddenDragScrollDirective implements OnInit, OnDestroy {
  @Input() scrollSpeed = 1.8; // Adjusted scroll speed multiplier
  
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private scrollLeft = 0;
  private hasMoved = false;
  private dragThreshold = 2; // Lower threshold for more responsive dragging
  private mouseDownListener: any;
  private mouseMoveListener: any;
  private mouseUpListener: any;
  private touchStartListener: any;
  private touchMoveListener: any;
  private touchEndListener: any;
  
  constructor(private el: ElementRef, private ngZone: NgZone) {}
  
  ngOnInit(): void {
    // Run outside Angular's change detection for better performance
    this.ngZone.runOutsideAngular(() => {
      // Setup all event listeners
      this.setupEvents();
    });
      // Force the scrollbar to be hidden for cross-browser compatibility
    const element = this.el.nativeElement as HTMLElement;
    element.style.overflowX = 'scroll';
    element.style.scrollbarWidth = 'none'; // Firefox
    // Microsoft Edge style - add via a class instead
    element.classList.add('ms-overflow-style-none');
  }
  
  private setupEvents(): void {
    const element = this.el.nativeElement;
    
    // Mouse events - using direct listeners instead of @HostListener for better control
    this.mouseDownListener = this.onMouseDown.bind(this);
    this.mouseMoveListener = this.onMouseMove.bind(this);
    this.mouseUpListener = this.onMouseUp.bind(this);
    
    element.addEventListener('mousedown', this.mouseDownListener);
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
    
    // Touch events
    this.touchStartListener = this.onTouchStart.bind(this);
    this.touchMoveListener = this.onTouchMove.bind(this);
    this.touchEndListener = this.onTouchEnd.bind(this);
    
    // Add touch event listeners with proper options
    element.addEventListener('touchstart', this.touchStartListener, { passive: true });
    element.addEventListener('touchmove', this.touchMoveListener, { passive: true });
    element.addEventListener('touchend', this.touchEndListener);
    element.addEventListener('touchcancel', this.touchEndListener);
  }
  
  private onMouseDown(e: MouseEvent): void {
    // Store the mouse position and current scroll position
    this.isDragging = true;
    this.hasMoved = false;
    this.startX = e.pageX;
    this.scrollLeft = this.el.nativeElement.scrollLeft;
    
    // Prevent text selection during drag
    e.preventDefault();
    
    // Add grabbing cursor to the document during drag
    document.body.style.cursor = 'grabbing';
  }
  
  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    
    // Calculate how far the mouse has moved
    const x = e.pageX;
    const diff = Math.abs(x - this.startX);
    
    if (diff > this.dragThreshold) {
      this.hasMoved = true;
      
      // Calculate the new scroll position
      const walk = (this.startX - x) * this.scrollSpeed;
      
      // Apply the scroll immediately
      this.applyScroll(this.scrollLeft + walk);
    }
  }
  
  private onMouseUp(e: MouseEvent): void {
    this.isDragging = false;
    
    // If we're ending a drag operation, prevent the click
    if (this.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Reset cursor
    document.body.style.cursor = '';
  }
  
  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    this.startX = touch.pageX;
    this.startY = touch.pageY;
    this.scrollLeft = this.el.nativeElement.scrollLeft;
    this.isDragging = true;
    this.hasMoved = false;
  }
    
  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const moveX = Math.abs(touch.pageX - this.startX);
    const moveY = Math.abs(touch.pageY - this.startY);
    
    // Only handle horizontal scrolling to prevent page scroll interference
    if (moveX > moveY && moveX > this.dragThreshold) {
      const walk = (this.startX - touch.pageX) * this.scrollSpeed;
      
      // Apply the scroll
      this.applyScroll(this.scrollLeft + walk);
      this.hasMoved = true;
    }
  }
  
  private onTouchEnd(): void {
    this.isDragging = false;
  }
    
  private applyScroll(position: number): void {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      this.el.nativeElement.scrollLeft = position;
    });
  }
    ngOnDestroy(): void {
    // Clean up event listeners
    const element = this.el.nativeElement;
    
    // Clean up touch events
    if (this.touchStartListener) {
      element.removeEventListener('touchstart', this.touchStartListener);
    }
    if (this.touchMoveListener) {
      element.removeEventListener('touchmove', this.touchMoveListener);
    }
    if (this.touchEndListener) {
      element.removeEventListener('touchend', this.touchEndListener);
      element.removeEventListener('touchcancel', this.touchEndListener);
    }
    
    // Clean up mouse events
    if (this.mouseDownListener) {
      element.removeEventListener('mousedown', this.mouseDownListener);
    }
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
    }
  }
}
