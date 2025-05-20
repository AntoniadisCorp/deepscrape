import { ApplicationRef, ComponentRef, Directive, ElementRef, EmbeddedViewRef, HostListener, Injector, Input, ViewContainerRef, inject } from '@angular/core';
import { TooltipComponent } from '../components';
import { TooltipPosition } from '../enum'
import { WindowToken } from '../services'
import { Subject } from 'rxjs/internal/Subject';
import { debounceTime } from 'rxjs/internal/operators/debounceTime';
import { Subscription } from 'rxjs';




@Directive({
  selector: '[tooltip]'
})
export class TooltipDirective {

  private window = inject(WindowToken)
  @Input() tooltip = '';
  @Input() position: string = TooltipPosition.DEFAULT;

  private handleSubs: Subscription
  private componentRef: ComponentRef<any> = null as any
  private handleMouseMove = new Subject<MouseEvent>()

  hideTimeout: number;
  showTimeout: number | undefined
  showDelay: number | undefined = 300
  hideDelay: number | undefined = 300

  constructor(

    // private elementRef: ElementRef,
    // private appRef: ApplicationRef,
    // private injector: Injector,
    private viewContainerRef: ViewContainerRef) {
  }

  @HostListener('mouseenter')
  onMouseEnter(event: MouseEvent): void {
    this.handleMouseMove.next(event) // Subject or observable
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hideTimeout = this.window.setTimeout(this.destroy.bind(this), this.hideDelay)
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.handleSubs = this.handleMouseMove.pipe(debounceTime(100)).subscribe(event => {
      // Handle the debounced event
      if (this.componentRef === null) {
        this.componentRef = this.viewContainerRef.createComponent(TooltipComponent)
        const domElem =
          (this.componentRef.hostView as EmbeddedViewRef<any>)
            .rootNodes[0] as HTMLElement
        // append tooltip component to the DOM parent element where called without affecting the DOM tree
        const hostElement = this.viewContainerRef.element.nativeElement
        hostElement.appendChild(domElem)
        this.setTooltipComponentProperties()
      }
    })
  }

  private showTooltip() {
    if (this.componentRef !== null) {
      this.componentRef.instance.visible = true;
    }
  }

  setTooltipComponentProperties() {
    if (this.componentRef !== null) {
      this.componentRef.instance.tooltip = this.tooltip;
      this.componentRef.instance.position = this.position

      // const { left, right, top, bottom } = this.elementRef.nativeElement.getBoundingClientRect()


      switch (this.position) {
        case TooltipPosition.BELOW: {
          this.componentRef.instance.left = 20// Math.round((right - left) / 2 + left);
          this.componentRef.instance.top = 20 // Math.round(bottom);
          break;
        }
        case TooltipPosition.ABOVE: {
          this.componentRef.instance.left = 20// Math.round((right - left) / 2 + left);
          this.componentRef.instance.top = 0;
          break;
        }
        case TooltipPosition.RIGHT: {
          this.componentRef.instance.left = 30 // Math.round(right);
          this.componentRef.instance.top = 20 // Math.round(top + (bottom - top) / 2);
          break;
        }
        case TooltipPosition.LEFT: {
          this.componentRef.instance.left = -30 // Math.round(left);
          this.componentRef.instance.top = 20 // Math.round(top + (bottom - top) / 2);
          break;
        }
        default: {
          break;
        }
      }
      this.showTooltip()
      // this.showTimeout = this.window.setTimeout(() => { this.showTooltip() }, this.showDelay)
    }
  }
  ngOnDestroy(): void {
    this.destroy()
    this.handleMouseMove?.unsubscribe()
    this.handleSubs?.unsubscribe()
  }

  destroy(): void {
    if (this.componentRef !== null) {
      this.window.clearTimeout(this.showTimeout);


      this.componentRef.destroy();
      this.componentRef = null as any
    }
  }

}
