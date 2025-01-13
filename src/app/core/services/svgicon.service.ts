
import { DomSanitizer } from '@angular/platform-browser'
import { IconResolver, MatIconRegistry } from '@angular/material/icon'
import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})


export class SvgIconService {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) { }

  getSvg(iconName: string) {
    this.matIconRegistry.getNamedSvgIcon(iconName)
  }

  setSvg(iconName: string, svgIurl: string) {
    this.matIconRegistry.addSvgIcon(
      iconName,
      this.domSanitizer.bypassSecurityTrustResourceUrl(svgIurl)
    )
  }

  addSvgIconResolver() {
    const resolver: IconResolver = (name) => {
      return this.domSanitizer.bypassSecurityTrustResourceUrl(`/assets/svg/${name}.svg`)
    }
    this.matIconRegistry.addSvgIconResolver(resolver)

    // Custom font set registration
    // this.matIconRegistry.registerFontClassAlias('fas', 'custom-font');
  }

  getSvgFromUrl(svgIurl: string) {
    this.matIconRegistry.getSvgIconFromUrl(this.domSanitizer.bypassSecurityTrustResourceUrl(svgIurl))
  }
}