import {
  Directive,
  ElementRef,
  Inject,
  Input,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * SSR-safe scroll reveal.
 *
 * Usage: <section appReveal [revealDelay]="120">...</section>
 *
 * - Content stays visible by default in the prerendered HTML (SEO / no-JS safe).
 * - Only in a real browser, once the element is near the viewport, the host
 *   gets `is-visible` which transitions it from the hidden `.reveal` state.
 *   `revealDelay` (ms) staggers siblings.
 * - Respects `prefers-reduced-motion` (skips hiding entirely).
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input() revealDelay = 0;

  private readonly host: HTMLElement = this.el.nativeElement;
  private io?: IntersectionObserver;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    // Hide only client-side so the SSR/prerendered HTML stays fully visible.
    this.renderer.addClass(this.host, 'reveal');
    if (this.revealDelay) {
      this.renderer.setStyle(this.host, 'transition-delay', `${this.revealDelay}ms`);
    }

    const reveal = () => {
      this.renderer.addClass(this.host, 'is-visible');
      this.io?.unobserve(this.host);
      this.io?.disconnect();
      this.io = undefined;
    };

    this.io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) reveal();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -12% 0px' },
    );
    this.io.observe(this.host);

    // Safety net: some embedded/headless browsers throttle IntersectionObserver.
    // If the element is already within the viewport, reveal it straight away.
    const win = this.document.defaultView;
    const rect = this.host.getBoundingClientRect();
    const vh = win?.innerHeight ?? 0;
    const alreadyInView =
      rect.top < vh && rect.bottom > 0 && rect.width > 0 && rect.height > 0;
    if (alreadyInView) {
      // Wait a frame so the hide → show transition still reads as an entrance.
      win?.requestAnimationFrame?.(reveal);
    }
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
  }
}
