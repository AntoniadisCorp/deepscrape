import { ApplicationRef, ComponentRef, Directive, ElementRef, EmbeddedViewRef, HostListener, Injector, Input, ViewContainerRef, inject, OnDestroy, OnInit, DOCUMENT } from '@angular/core'
import { TooltipComponent } from '../components'
import { TooltipPosition, TooltipTheme } from '../enum'
import { WindowToken } from '../services'
import { Subject, Subscription, timer } from 'rxjs'
import { debounceTime, takeUntil } from 'rxjs/operators'


@Directive({
  selector: '[tooltip]'
})
export class TooltipDirective implements OnInit, OnDestroy {  
  @Input() tooltip = ''
  @Input() position: string = TooltipPosition.DEFAULT
  @Input() tooltipPosition: string = TooltipPosition.DEFAULT
  @Input() tooltipClass: string = ''
  @Input() tooltipTheme: string = TooltipTheme.DEFAULT
  
  private window = inject(WindowToken)
  private document = inject(DOCUMENT)
  
  // This getter ensures we prioritize tooltipPosition if provided
  private get effectivePosition(): string {
    return this.tooltipPosition !== TooltipPosition.DEFAULT ? this.tooltipPosition : this.position
  }
  private subscriptions: Subscription[] = []
  private componentRef: ComponentRef<any> = null as any
  private handleMouseMove = new Subject<MouseEvent>()
  private destroy$ = new Subject<void>()

  // Configuration
  showDelay: number = 300
  hideDelay: number = 300

  constructor(
    private elementRef: ElementRef,
    private appRef: ApplicationRef,
    private injector: Injector,
    private viewContainerRef: ViewContainerRef
  ) {}
  @HostListener('mouseenter', ['$event'])
  onMouseEnter(event: MouseEvent): void {
    // Cancel any pending destroy timer
    this.destroy$.next()
    this.handleMouseMove.next(event)
  }
  
  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.componentRef !== null) {
      this.componentRef.instance.setVisibility(false)
      
      // Use timer observable instead of setTimeout
      const hideSubscription = timer(this.hideDelay)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.destroy()
        })
      
      this.subscriptions.push(hideSubscription)
    }
  }
  ngOnInit(): void {
    const mouseMoveSub = this.handleMouseMove
      .pipe(debounceTime(100))
      .subscribe(event => {
        if (this.componentRef === null) {
          // Create the component without using EmbeddedViewRef
          this.componentRef = this.viewContainerRef.createComponent(TooltipComponent)
          
          // Get the tooltip element directly from the component's location property
          const tooltipElement = this.componentRef.location.nativeElement
          
          // Append to document body for better positioning
          this.document.body.appendChild(tooltipElement)
          
          if (this.tooltipClass) {
            tooltipElement.classList.add(this.tooltipClass)
          }
          
          this.setTooltipComponentProperties()
        }
      })
    
    this.subscriptions.push(mouseMoveSub)
  }

  private showTooltip(): void {
    if (this.componentRef !== null) {
      this.componentRef.instance.setVisibility(true)
    }
  }
  setTooltipComponentProperties(): void {
    if (this.componentRef !== null) {
      this.componentRef.instance.tooltip = this.tooltip
      this.componentRef.instance.position = this.effectivePosition
      
      // Set the theme if provided
      if (this.tooltipTheme) {
        const tooltipElement = this.componentRef.location.nativeElement
        tooltipElement.classList.add(`tooltip--${this.tooltipTheme}`)
      }
      
      // Get the element's position relative to the viewport
      const { left, right, top, bottom, width, height } = this.elementRef.nativeElement.getBoundingClientRect()
      const tooltipElement = this.componentRef.location.nativeElement
      
      // Make tooltip visible temporarily to get its dimensions
      tooltipElement.style.visibility = 'hidden'
      tooltipElement.style.display = 'block'
      tooltipElement.style.position = 'fixed' // Ensure position is fixed for correct measurement
      const tooltipWidth = tooltipElement.offsetWidth
      const tooltipHeight = tooltipElement.offsetHeight
      tooltipElement.style.visibility = ''
      tooltipElement.style.display = ''
      
      // Calculate position relative to viewport
      let tooltipLeft = 0
      let tooltipTop = 0
        // Position based on the effective position setting
      switch (this.effectivePosition) {
        case TooltipPosition.BELOW: {
          // Center horizontally and position below
          tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
          tooltipTop = bottom + 5 
          break
        }
        case TooltipPosition.ABOVE: {
          // Center horizontally and position above
          tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
          tooltipTop = top - tooltipHeight - 5
          break
        }
        case TooltipPosition.RIGHT: {
          // Center vertically and position to the right
          tooltipLeft = right + 5
          tooltipTop = top + (height / 2) - (tooltipHeight / 2)
          break
        }
        case TooltipPosition.LEFT: {
          // Center vertically and position to the left
          tooltipLeft = left - tooltipWidth - 5
          tooltipTop = top + (height / 2) - (tooltipHeight / 2)
          break
        }
        default: {
          // Default to above (matches Material design)
          tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
          tooltipTop = top - tooltipHeight - 5
          break
        }      }
      
      // Keep tooltip within viewport
      const viewportWidth = this.window.innerWidth
      const viewportHeight = this.window.innerHeight
      
      // Ensure tooltip stays within viewport boundaries with padding
      tooltipLeft = Math.max(10, Math.min(tooltipLeft, viewportWidth - tooltipWidth - 10))
      tooltipTop = Math.max(10, Math.min(tooltipTop, viewportHeight - tooltipHeight - 10))
        // Since we're using position: fixed, we don't need to adjust for scroll position
      // as fixed positioning is relative to the viewport
      this.componentRef.instance.left = tooltipLeft
      this.componentRef.instance.top = tooltipTop
        // Show tooltip with a small delay using timer observable
      const showSubscription = timer(this.showDelay)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.showTooltip()
        })
      
      this.subscriptions.push(showSubscription)
    }
  }
  ngOnDestroy(): void {
    this.destroy()
    this.destroy$.next()
    this.destroy$.complete()
    this.handleMouseMove?.complete()
    
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }
  destroy(): void {
    if (this.componentRef !== null) {
      // First make sure the element is removed from the DOM
      const tooltipElement = this.componentRef.location.nativeElement
      if (tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement)
      }
      
      // Then destroy the component reference
      this.componentRef.destroy()
      this.componentRef = null as any
    }
  }
}
