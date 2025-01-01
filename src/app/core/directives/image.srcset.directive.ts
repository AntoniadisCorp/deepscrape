// src/app/directives/image.srcset.directive.ts
import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: 'img[srcset], img[data-srcset]',
  standalone: true,
})
export class ImageSrcsetDirective implements OnInit, OnDestroy {
  @Input() dataSrcset: string;
  @Input() srcset: string | null;

  private _image?: HTMLImageElement;

  constructor(private elementRef: ElementRef) { }
  ngOnInit(): void {
    this._image = this.elementRef.nativeElement;
  }

  ngOnDestroy(): void {
    this._image = undefined
  }

  private _loadImageUrl(url: string): void {
    this.nativeElement.srcset = url;
    this.nativeElement.onerror = () => {
      this._handleError();
    };
    this.nativeElement.onload = () => {
      this._handleLoad();
    };
  }

  private _handleError(): void {
    // Replace with a fallback image URL
    this.nativeElement.srcset = 'https://eu.ui-avatars.com/api/?name=Prok+Ant' + '&size=250';
  }

  private _handleLoad(): void {
    this.nativeElement.onerror = null;
    this.nativeElement.onload = null;
  }

  private get nativeElement(): HTMLImageElement {
    return this._image as HTMLImageElement;
  }

  private get imageUrl(): string {
    return this.dataSrcset || this.srcset || '';
  }

  // This is the ngsrc equivalent
  private _setImageUrl(): void {
    if (this.imageUrl) {
      this._loadImageUrl(this.imageUrl);
    }
  }

  private getProvider(): void {
    // Implement provider logic
  }

  ngAfterViewInit(): void {
    this._setImageUrl();
  }

}