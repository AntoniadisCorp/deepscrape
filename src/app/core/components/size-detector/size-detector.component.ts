import { AfterViewInit, Component, ElementRef, HostListener, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser, NgFor } from '@angular/common';
import { ScreenResizeService, WindowToken } from 'src/app/core/services';
import { SCREEN_SIZE } from 'src/app/core/enum';


@Component({
    selector: 'app-size-detector',
    imports: [NgFor],
    templateUrl: './size-detector.component.html',
    styleUrl: './size-detector.component.scss'
})
// size-detector.component.ts

export class SizeDetectorComponent implements AfterViewInit {

  private isBrowser: boolean
  private _window = inject(WindowToken); // or window = inject(WINDOW);

  prefix = 'is-';
  sizes = [
    {
      id: SCREEN_SIZE.XS, name: 'xs', css: `block sm:hidden` // `d-block d-sm-none`
    },
    {
      id: SCREEN_SIZE.SM, name: 'sm', css: `hidden sm:block md:hidden` // `d-none d-sm-block d-md-none`
    },
    {
      id: SCREEN_SIZE.MD, name: 'md', css: `hidden md:block lg:hidden`  // `d-none d-md-block d-lg-none`
    },
    {
      id: SCREEN_SIZE.LG, name: 'lg', css: `hidden lg:block xl:hidden` // `d-none d-lg-block d-xl-none`
    },
    {
      id: SCREEN_SIZE.XL, name: 'xl', css: `hidden xl:block 2xl:hidden` // `d-none d-xl-block d-xxl-none`
    },
    {
      id: SCREEN_SIZE.XXL, name: '2xl', css: `hidden 2xl:block 3xl:hidden` // `d-none d-xxl-block`
    },
    {
      id: SCREEN_SIZE.XXXL, name: '3xl', css: `hidden 3xl:block` // `d-none d-xxl-block`
    },

  ];

  @HostListener("window:resize", ['$event'])
  private onResize() {

    // this.console.log('window:resize:')
    this.detectScreenSize();
  }

  constructor(
    private elementRef: ElementRef,
    private resizeSvc: ScreenResizeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      setTimeout(() => {
        this.detectScreenSize()
      })
    }
  }


  private detectScreenSize() {


    const currentSize = this.sizes.find(x => {
      // get the HTML element
      const el = this.elementRef.nativeElement.querySelector(`.${this.prefix}${x.id}`);

      // check its display property value
      const isVisible = this._window.getComputedStyle(el).display !== 'none';

      return isVisible;
    })

    if (currentSize)
      this.resizeSvc.onResize(currentSize.id)


  }
}