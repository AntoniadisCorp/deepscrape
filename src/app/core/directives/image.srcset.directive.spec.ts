import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageSrcsetDirective } from './image.srcset.directive';
import { ElementRef, Component } from '@angular/core';
import { getTestProviders } from 'src/app/testing';

@Component({
  standalone: true,
  imports: [ImageSrcsetDirective],
  template: '<img [srcset]="imageUrl" [name]="name">',
})
class TestComponent {
  imageUrl = 'test.jpg';
  name: string | null = 'John Doe';
}

describe('ImageSrcsetDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let imgElement: HTMLImageElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: getTestProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    imgElement = fixture.nativeElement.querySelector('img') as HTMLImageElement;
  });

  it('should set srcset on ngAfterViewInit', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.srcset = 'test.jpg';
    directive.ngOnInit();
    directive.ngAfterViewInit();
    expect(el.srcset).toContain('test.jpg');
  });

  it('should set fallback avatar on image error', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.name = 'John Doe';
    directive.srcset = 'broken.jpg';
    directive.ngOnInit();
    directive.ngAfterViewInit();

    if (el.onerror) {
      el.onerror(new ErrorEvent('error'));
    }

    expect(el.srcset).toContain('ui-avatars.com');
    expect(el.srcset).toContain('J+D');
  });

  it('should emit loading lifecycle and clear handlers on successful load', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.srcset = 'test.jpg';
    const loadingStates: boolean[] = [];
    directive.loadingChange.subscribe((state) => loadingStates.push(state));

    directive.ngOnInit();
    directive.ngAfterViewInit();

    if (el.onload) {
      el.onload(new Event('load'));
    }

    expect(loadingStates).toEqual([true, false]);
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

  it('should prioritize defaultSrcset when provided', () => {
    const el = document.createElement('img');
    const directive = new ImageSrcsetDirective(new ElementRef(el));
    directive.name = null;
    directive.defaultSrcset = 'https://example.com/fallback.webp';
    directive.ngOnInit();
    directive.ngAfterViewInit();

    if (el.onerror) {
      el.onerror(new ErrorEvent('error'));
    }

    expect(el.srcset).toContain('fallback.webp');
  });
});