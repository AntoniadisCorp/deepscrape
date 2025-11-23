import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { Component, inject, Inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ScrollService } from 'src/app/core/services';
import { myIcons } from 'src/app/shared';

@Component({
  selector: 'app-hero',
  imports: [LucideAngularModule, RouterLink, NgOptimizedImage],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {

  readonly icons = myIcons
  readonly bgImagePath = 'images/bgland-optimized.webp'
  private scroll = inject(ScrollService);
  constructor(private router: Router, @Inject(DOCUMENT) private document: Document) { }

  scrollTo(link: string) {
    const elem = this.document.getElementById(link) as HTMLElement
    if (elem)
      this.scroll.scrollToElementByOffset(elem)
  }


  scrollIntoView() {
    const url = this.router.url
    const id: string = url.substring(url.indexOf('#') + 1)
    if (id) this.scrollTo(id)
  }
}
