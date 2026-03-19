import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageSrcsetDirective } from './image.srcset.directive';
import { ElementRef, Component } from '@angular/core';
import { getTestProviders } from 'src/app/testing';

@Component({
  standalone: true,
  imports: [ImageSrcsetDirective],
  template: '<img [dataSrcset]="imageUrl" [name]="name">',
})
class TestComponent {
  imageUrl = 'test.jpg';
  name: string | null = 'John Doe';
}

describe('ImageSrcsetDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let imgElement: HTMLImageElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: getTestProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    imgElement = fixture.nativeElement.querySelector('img') as HTMLImageElement;
  });

  it('should create an instance', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    expect(directive).toBeTruthy();
  });

  it('should set srcset on ngAfterViewInit', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.dataSrcset = 'test.jpg';
    directive.ngOnInit();
    directive.ngAfterViewInit();
    expect(el.srcset).toContain('test.jpg');
  });

  it('should handle error and set fallback image', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.name = 'John Doe';
    directive.ngOnInit();
    directive.ngAfterViewInit();

    spyOn<any>(directive, '_handleError').and.callThrough();

    if (el.onerror) {
      el.onerror(new ErrorEvent('error'));
    }

    expect(directive['_handleError']).toHaveBeenCalled();
  });

  it('should clear onload and onerror on load', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.dataSrcset = 'test.jpg';
    directive.ngOnInit();
    directive.ngAfterViewInit();

    if (el.onload) {
      el.onload(new Event('load'));
    }

    expect(el.onload).toBeNull();
    expect(el.onerror).toBeNull();
  });

  it('should generate correct avatar URL on error', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.name = 'John Doe';
    directive.ngOnInit();
    directive.ngAfterViewInit();

    if (el.onerror) {
      el.onerror(new ErrorEvent('error'));
    }

    expect(el.srcset).toContain('ui-avatars.com');
    expect(el.srcset).toContain('J+D');
  });

  it('should use "NA" as default name if name is not provided', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.name = null;
    directive.ngOnInit();
    directive.ngAfterViewInit();

    if (el.onerror) {
      el.onerror(new ErrorEvent('error'));
    }

    expect(el.srcset).toContain('ui-avatars.com');
  });
});