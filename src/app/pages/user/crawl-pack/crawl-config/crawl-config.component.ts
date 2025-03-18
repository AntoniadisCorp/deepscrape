import { AsyncPipe, DatePipe, DOCUMENT, JsonPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, inject, Inject, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { NavigationEnd, Router } from '@angular/router';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs/internal/observable/of';
import { map } from 'rxjs/internal/operators/map';
import { Subscription } from 'rxjs/internal/Subscription';
import { DropdownComponent, RadioToggleComponent, SnackBarType, StinputComponent } from 'src/app/core/components';
import { browserTitleValidator, browserTypeValidator, cacheModeValidator } from 'src/app/core/directives';
import { CrawlCachingMode } from 'src/app/core/enum';
import { getErrorLabel, getOffsetTop, setCacheModeList } from 'src/app/core/functions';
import { FormControlPipe } from 'src/app/core/pipes';
import { CartService, PackService, ScrollService, SnackbarService, WindowToken } from 'src/app/core/services';
import { CrawlConfig, Size } from 'src/app/core/types';

@Component({
  selector: 'app-crawl-config',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, MatIcon, RadioToggleComponent, FormControlPipe, NgClass,
    StinputComponent, DropdownComponent, AsyncPipe, DatePipe, NgFor, MatProgressSpinner, JsonPipe
  ],
  templateUrl: './crawl-config.component.html',
  styleUrl: './crawl-config.component.scss'
})
export class CrawlConfigComponent {

  private window = inject(WindowToken)

  @HostListener('window:scroll', ['$event'])
  onScroll(event: any) {
    const scrollPosition = this.window.scrollY
    const links = this.links
    const activeLink = this.getActiveLink(scrollPosition, links)
    if (activeLink !== this.activeLink && activeLink)
      this.activeLink = activeLink
    // console.log(scrollPosition, activeLink)
  }

  // @ViewChild('controllingCrawl') controllingCrawl: ElementRef
  // @ViewChild('contentProcessing') contentProcessing: ElementRef
  // @ViewChild('cachingNSession') cachingNSession: ElementRef
  // @ViewChild('pageNavigationTiming') pageNavigationTiming: ElementRef
  // @ViewChild('pageInteraction') pageInteraction: ElementRef
  // @ViewChild('mediaHandling') mediaHandling: ElementRef
  // @ViewChild('linkDomainHandling') linkDomainHandling: ElementRef

  configForm: FormGroup
  private links: { id: string, label: string }[]
  protected activeLink: string | null = null
  protected showLink: boolean
  protected newConfigOpened: boolean
  protected savingNewConfig: boolean
  protected showSettings: boolean

  protected cachModeOptions: Size[] = []

  protected configSelectedById: string | undefined

  protected crawlConfig$: Observable<CrawlConfig[] | null | undefined>

  protected totalConfigPages$: Observable<number>
  protected inTotal$: Observable<number>
  protected packCart$: Observable<any>

  private crawlConfigSubs: Subscription
  private packService: PackService

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private scroll: ScrollService,
    private cartService: CartService,

    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document,
  ) {


    this.links = [{ id: 'controlling-each-crawl', label: 'Controlling Each Crawl' },
    { id: 'caching-session', label: 'Caching & Session' },
    { id: 'content-processing', label: 'Content Processing' },
    { id: 'page-nav-timing', label: 'Page Navigation Timing' },
    { id: 'page-interaction', label: 'Page Interaction' },
    { id: 'media-handling', label: 'Media Handling' },
    { id: 'link-domain-handling', label: 'Link/Domain Handling' },
    { id: 'debug-logging', label: 'Debug & Logging' },
    ]
    this.crawlConfig$ = of([])
    this.packCart$ = this.cartService.getCart().pipe(
      map(cart => cart?.crawlConfig)
    )

    // set pack service with custom injectToken to be used on retrieving list of configurations by pagination
    this.packService = new PackService('crawlConfigs')


  }

  ngOnInit() {
    this.initForm()
    this.setCrawlConfiguration()

    // set toggle buttons
    this.showLink = this.showSettings = this.newConfigOpened = this.savingNewConfig = false
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    this.scrollIntoView()
    this.cdr.detectChanges()
  }


  initForm() {

    this.activeLink = ''

    this.configForm = this.fb.group({
      // Crawler Configuration Title
      title: this.fb.control('', {
        nonNullable: true, validators: [
          Validators.required,
          browserTitleValidator()
        ]
      }),

      // Content Processing Parameters
      wordCountThreshold: this.fb.control(200, {
        nonNullable: true, validators: [
          Validators.required, Validators.pattern('^[0-9]+$'), Validators.min(1), Validators.max(10000)
        ]
      }),
      extractionStrategy: [null],
      chunkingStrategy: [null],
      markdownGenerator: [null],
      contentFilter: [null],
      cssSelector: [null],
      onlyText: [false],
      excludedTags: [null],
      excludedSelector: [null],
      keepDataAttributes: [false],
      // FIXME: add new features to the form
      // keepAttributes: [null],
      // parserType: ['lxml'],
      removeForms: [false],
      prettify: [false],


      // Caching Parameters
      cacheMode: this.fb.control(
        {
          name: CrawlCachingMode.NONE.toUpperCase(),
          code: CrawlCachingMode.NONE.toLowerCase()
        }, { // Default value
        nonNullable: true,
        validators: [
          Validators.required,
          cacheModeValidator(),
        ],
      }) as FormControl<Size>,
      sessionId: [null],
      bypassCache: [false],
      disableCache: [false],
      noCacheRead: [false],
      noCacheWrite: [false],

      // Page Navigation and Timing Parameters
      waitUntil: ['domcontentloaded'],
      waitFor: [null],
      waitForImages: [false],
      pageTimeout: this.fb.control(60000, {
        nonNullable: true, validators: [
          Validators.required, Validators.min(1000), Validators.pattern('^[0-9]+$'), Validators.max(100000)
        ]
      }),
      delayBeforeReturnHtml: [0.1],
      checkRobotsTxt: [false],
      meanDelay: [0.1],
      maxRange: [0.3],
      semaphoreCount: [5],

      // Page Interaction Parameters
      jsCode: [null],
      jsOnly: [false],
      ignoreBodyVisibility: [true],
      scanFullPage: [false],
      scrollDelay: [0.2],
      processIframes: [false],
      removeOverlayElements: [false],
      simulateUser: [false],
      overrideNavigator: [false],
      magic: [false],
      adjustViewportToContent: [false],

      // Media Handling Parameters
      screenshot: [false],
      pdf: [false],
      screenshotWaitFor: [null],
      screenshotHeightThreshold: this.fb.control(60000, {
        nonNullable: true, validators: [
          Validators.required, Validators.min(1000), Validators.pattern('^[0-9]+$'), Validators.max(100000)
        ]
      }),
      imageDescriptionMinWordThreshold: [50],
      imageScoreThreshold: [3],
      excludeExternalImages: [false],

      // Link and Domain Handling Parameters
      excludeSocialMediaDomains: [[]],
      excludeExternalLinks: [false],
      excludeSocialMediaLinks: [false],
      excludeDomains: [[]],

      // Debugging and Logging Parameters
      verbose: [true],
      logConsole: [false]

      // Other parameters with default values
    }
    )

  }

  private setCrawlConfiguration() {

    this.crawlConfig$ = this.packService.crawlConfigs$

    setCacheModeList(this.cachModeOptions)

    this.configSelectedById = ''
  }

  onCacheModeSelect(event: Event) {
    // const selectedValue = (event.target as HTMLSelectElement).value;
    // this.configForm.get('cacheMode')?.setValue(null)
  }

  protected addCrawlConfig() {
    this.newConfigOpened = !this.newConfigOpened

    this.showSettings = this.newConfigOpened

    // reset saving state
    this.savingNewConfig = false

    // reset form to default values
    this.configForm.reset()
    console.log('reset form', this.configForm.valid, this.configForm.errors)
  }

  saveConfiguration() {
    if (this.configForm.valid) {
      const configData: CrawlConfig = {
        ...this.configForm.value,
        // id: uuidv4(), // Generate unique ID
        createdAt: new Date()
      };

      /* this.firestore.collection('crawl-pack-configs')
        .add(configData)
        .then(() => {
          alert('Configuration saved successfully!');
          this.configForm.reset();
        })
        .catch(error => {
          console.error('Error saving configuration', error);
        }); */
    }
  }


  onSelectCrawlConfig(crawl: CrawlConfig) {
    // this.selectedProfile = profile
    // this.configForm.get('userDataDir')?.setValue(profile.path)

    if (this.newConfigOpened)
      this.newConfigOpened = false
    else
      this.showSettings = true

    if (this.showSettings) {
      this.configSelectedById = crawl.id
      this.configForm.get('title')?.setValue(crawl.title)

      // set form values
      this.configForm.patchValue(crawl.config)
      // this.browserType.patchValue({ code: crawl.config.browserType, name: crawl.config.browserType?.toUpperCase() })
    } else {
      this.configSelectedById = ''
      this.configForm.reset()
    }

  }

  actionProfileClicked(event: Event, crawl: CrawlConfig) {
    event.stopPropagation() // prevent default behavior of outer div
    console.log(crawl)
  }


  addPackToCart(event: Event, crawl: CrawlConfig) {

    event.stopPropagation() // prevent default behavior of outer div

    // add crawler pacakage item,the configuration Browser Profile, to the cart system
    this.cartService.addItemToCart({ crawlConfig: crawl })

    // on add to cart, update cart buttons
    this.packCart$ = this.cartService.getCart().pipe(
      map(cart => cart?.crawlConfig)
    )
  }

  removePackFromCart(event: Event,) {
    event.stopPropagation() // prevent default behavior of outer div

    // remove crawler pacakage item,the configuration Browser Profile, from the cart system
    this.cartService.removeItemFromCart('crawlConfig')

    // one remove update cart buttons
    this.packCart$ = this.cartService.getCart().pipe(
      map(cart => cart?.crawlConfig)
    )
  }

  scrollTo(link: string) {
    this.activeLink = link
    const elem = this.document.getElementById(link) as HTMLElement
    if (elem)
      this.scroll.scrollToElementByOffset(this.document.getElementById(link) as HTMLElement, 10 * 16)

  }

  scrollIntoView() {
    const url = this.router.url
    const id: string = url.substring(url.indexOf('#') + 1)
    if (id) this.scrollTo(id)
  }


  getActiveLink(scrollPosition: number, links: { id: string, label: string }[]): string | null {
    let activeLink: string | null = null
    let minDistance = Infinity;

    links.forEach((link) => {
      const element = this.document.getElementById(link.id)
      const extraFixedDistance = (link.id === 'controlling-each-crawl' || link.id === 'content-processing' ? -50 : link.id === 'debug-logging' ? -100 : 200)
      if (element) {
        const distance = Math.abs(scrollPosition - getOffsetTop(element) - extraFixedDistance)

        if (distance < minDistance) {
          minDistance = distance
          activeLink = link.id
        }
      }
    })
    return activeLink;
  }

  private scrollToHash() {
    this.scroll.scrollAfterRender(300)
  }

  showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }


  getErrorLabel(controlName: string): string | undefined {
    return getErrorLabel(this.configForm, controlName)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.crawlConfigSubs?.unsubscribe()
  }

}
