import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';

import { SvgIconService } from './svgicon.service';
import { getTestProviders } from 'src/app/testing';

describe('SvgIconService', () => {
  let service: SvgIconService;
  let iconRegistryMock: jasmine.SpyObj<MatIconRegistry>;
  let sanitizerMock: jasmine.SpyObj<DomSanitizer>;

  beforeEach(() => {
    iconRegistryMock = jasmine.createSpyObj('MatIconRegistry', [
      'getNamedSvgIcon',
      'addSvgIcon',
      'addSvgIconResolver',
      'getSvgIconFromUrl',
    ]);
    sanitizerMock = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustResourceUrl']);
    sanitizerMock.bypassSecurityTrustResourceUrl.and.callFake((value: string) => value as any);
    iconRegistryMock.getNamedSvgIcon.and.returnValue(of({} as any));
    iconRegistryMock.getSvgIconFromUrl.and.returnValue(of({} as any));

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: MatIconRegistry, useValue: iconRegistryMock },
        { provide: DomSanitizer, useValue: sanitizerMock },
      ],
    });

    service = TestBed.inject(SvgIconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request named svg from icon registry', () => {
    service.getSvg('crawl-icon');

    expect(iconRegistryMock.getNamedSvgIcon).toHaveBeenCalledWith('crawl-icon');
  });

  it('should sanitize and register svg icon url', () => {
    service.setSvg('crawl-icon', '/assets/svg/crawl.svg');

    expect(sanitizerMock.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/assets/svg/crawl.svg');
    expect(iconRegistryMock.addSvgIcon).toHaveBeenCalledWith('crawl-icon', '/assets/svg/crawl.svg' as any);
  });

  it('should register resolver with assets svg path', () => {
    service.addSvgIconResolver();

    expect(iconRegistryMock.addSvgIconResolver).toHaveBeenCalled();
    const resolver = iconRegistryMock.addSvgIconResolver.calls.mostRecent().args[0] as (name: string) => any;
    resolver('search');

    expect(sanitizerMock.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/assets/svg/search.svg');
  });
});
