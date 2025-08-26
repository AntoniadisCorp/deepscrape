// src/app/directives/image.srcset.directive.ts
import { Directive, ElementRef, Input, OnDestroy, OnInit, AfterViewInit, Output, EventEmitter, NgZone, inject } from '@angular/core';

@Directive({
  selector: 'img[srcset], img[data-srcset]'
})
export class ImageSrcsetDirective implements OnInit, OnDestroy, AfterViewInit {
  @Input() dataSrcset: string;
  @Input() srcset: string | null

  @Input() defaultSrcset: string
  @Input() name: string | null;

  @Output() loadingChange = new EventEmitter<boolean>();

  private _image?: HTMLImageElement;
  private _loading: boolean = false
  constructor(private elementRef: ElementRef) { }
  ngOnInit(): void {
    this._image = this.elementRef.nativeElement
    console.log('ImageSrcsetDirective initialized with srcset:', this.imageUrl, this.defaultSrcset);
    
    this._handleError()
  }

  ngOnDestroy(): void {
    this._image = undefined
  }

  private _loadImageUrl(url: string): void {
    this.loading = true;
    this.nativeElement.srcset = url;
    this.nativeElement.onerror = () => {
      this._handleError()
    };
    this.nativeElement.onload = () => {
      this._handleLoad();
    };
  }

  private _handleError(): void {
    this.loading = false;
    // Replace with a fallback image URL
    this.nativeElement.srcset = this.defaultSrcset || `https://ui-avatars.com/api/?name=${this._handlerName(this.name || 'An+Ym')}&background=random&size=128`;
  }

  private _handlerName(fullName: string): string {
    // Split the full name into first name and last name
    const [firstName, lastName] = fullName.split(' ');
    const firstLetterFirstName = firstName?.charAt(0);
    const firstLetterLastName = lastName?.charAt(0);
    return firstLetterFirstName + '+' + firstLetterLastName;

  }

  private _handleLoad(): void {
    this.loading = false;
    this.nativeElement.onerror = null;
    this.nativeElement.onload = null;
  }

  private get nativeElement(): HTMLImageElement {
    return this._image as HTMLImageElement;
  }

  private get imageUrl(): string {
    return this.defaultSrcset || this.dataSrcset || this.srcset || '';
  }

  // This is the ngsrc equivalent
  private _setImageUrl(): void {
    if (this.imageUrl) {
      this._loadImageUrl(this.imageUrl);
    }
  }

  ngAfterViewInit(): void {
    this._setImageUrl();
  }

  set loading(value: boolean) {
    if (this._loading !== value) {
      this._loading = value;
      this.loadingChange.emit(value);
    }
  }

  get loading(): boolean {
    return this._loading;
  }

}
