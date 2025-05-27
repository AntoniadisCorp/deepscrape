import { AsyncPipe, DatePipe, DOCUMENT, JsonPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, inject, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs/internal/observable/of';
import { map } from 'rxjs/internal/operators/map';
import { Subscription } from 'rxjs/internal/Subscription';
import { DropdownComponent, RadioToggleComponent, SnackBarType, StinputComponent } from 'src/app/core/components';
import {
  browserTitleValidator, cacheModeValidator, containsStrings, cssSelector, delayBeforeReturnHtmlValidator, excludeDomains, excludedSelector,
  includesStrings, jsCodeValidator, sessionIdValidator, waitForValidator
} from 'src/app/core/directives';
import { CrawlCachingMode } from 'src/app/core/enum';
import { getErrorLabel, getOffsetTop, setCacheModeList } from 'src/app/core/functions';
import { FormControlPipe } from 'src/app/core/pipes';
import { CartService, PackService, ScrollService, SnackbarService, WindowToken } from 'src/app/core/services';
import { CrawlConfig, CrawlerRunConfig, DropDownOption } from 'src/app/core/types';

@Component({
  selector: 'app-crawl-config',
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

  protected cachModeOptions: DropDownOption[] = []

  protected configSelectedById: string | undefined

  protected crawlConfigs$: Observable<CrawlConfig[] | null | undefined>

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

    this.crawlConfigs$ = of([])

    this.packCart$ = this.cartService.getCart$.pipe(
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
        nonNullable: false, validators: [
          Validators.pattern('^[0-9]+$'),
          Validators.min(1),
          Validators.max(10000)
        ]
      }),
      // extractionStrategy: [null],
      // chunkingStrategy: [null],
      // markdownGenerator: [null],
      // contentFilter: [null],
      // targetElements: [null], // List[str] (None)
      cssSelector: this.fb.control(null,
        {
          nonNullable: false,
          validators: [
            cssSelector()
          ]
        }) as FormControl<string | null>,
      onlyText: this.fb.control(false, { nonNullable: true, validators: [] }),
      // excludedTags: [null],  
      excludedSelector: this.fb.control(null,
        {
          nonNullable: false,
          validators: [
            excludedSelector()
          ]
        }) as FormControl<string | null>,
      keepDataAttributes: this.fb.control(false, { nonNullable: true, validators: [] }),
      // FIXME: add new features to the form
      // keepAttributes: [null],
      // parserType: ['lxml'],
      removeForms: this.fb.control(false, { nonNullable: true, validators: [] }),
      prettify: this.fb.control(false, { nonNullable: true, validators: [] }),


      // Caching Parameters
      cacheMode: this.fb.control(
        {
          name: CrawlCachingMode.NONE.toUpperCase(),
          code: CrawlCachingMode.NONE.toLowerCase()
        }, { // Default value
        nonNullable: true,
        validators: [
          cacheModeValidator(),
        ],
      }) as FormControl<DropDownOption>,
      sessionId: this.fb.control('', {
        nonNullable: false, validators: [
          sessionIdValidator(94) // 3 - 60 characters
        ]
      }),
      bypassCache: this.fb.control(false, { nonNullable: true, validators: [] }),
      disableCache: this.fb.control(false, { nonNullable: true, validators: [] }),
      noCacheRead: this.fb.control(false, { nonNullable: true, validators: [] }),
      noCacheWrite: this.fb.control(false, { nonNullable: true, validators: [] }),

      // Page Navigation and Timing Parameters 
      waitUntil: this.fb.control("domcontentloaded",
        {
          nonNullable: false,
          validators: [
            containsStrings(['domcontentloaded', 'load', 'networkidle0', 'networkidle2']) // 3 - 60 characters
          ]
        }),
      waitFor: this.fb.control(null,
        {
          nonNullable: false,
          validators: [
            waitForValidator() // 3 - 60 characters
          ]
        }) as FormControl<string | null>, // 
      waitForImages: this.fb.control(false, { nonNullable: true, validators: [] }),
      checkRobotsTxt: this.fb.control(false, { nonNullable: true, validators: [] }),
      pageTimeout: this.fb.control(60000, {
        nonNullable: false, validators: [
          Validators.min(1000),
          Validators.pattern('^[0-9]+$'),
          Validators.max(100000)
        ]
      }),
      delayBeforeReturnHtml: this.fb.control(.1, {
        nonNullable: false, validators: [
          delayBeforeReturnHtmlValidator(0, 10, .1, 'delayBeforeReturnHtml')
        ]
      }),
      // meanDelay: [0.1], jsCodeValidator
      // maxRange: [0.3],
      // semaphoreCount: [5],

      // Page Interaction Parameters
      jsCode: this.fb.control(null,
        {
          nonNullable: false,
          validators: [
            jsCodeValidator() // 3 - 60 characters
          ]
        }) as FormControl<string | null>,
      jsOnly: this.fb.control(false, { nonNullable: true, validators: [] }),
      ignoreBodyVisibility: this.fb.control(true, { nonNullable: true, validators: [] }),
      scanFullPage: this.fb.control(false, { nonNullable: true, validators: [] }),
      scrollDelay: this.fb.control(.2, {
        nonNullable: false, validators: [
          delayBeforeReturnHtmlValidator(0, 10, .2, 'scrollDelay')
        ]
      }),
      processIframes: this.fb.control(false, { nonNullable: true, validators: [] }),
      removeOverlayElements: this.fb.control(false, { nonNullable: true, validators: [] }),
      simulateUser: this.fb.control(false, { nonNullable: true, validators: [] }),
      overrideNavigator: this.fb.control(false, { nonNullable: true, validators: [] }),
      magic: this.fb.control(false, { nonNullable: true, validators: [] }),
      adjustViewportToContent: this.fb.control(false, { nonNullable: true, validators: [] }),

      // Media Handling Parameters
      screenshot: this.fb.control(false, { nonNullable: true, validators: [] }),
      pdf: this.fb.control(false, { nonNullable: true, validators: [] }),
      screenshotWaitFor: this.fb.control(.2, {
        nonNullable: false, validators: [
          delayBeforeReturnHtmlValidator(0, 10, .2, 'screenshotWaitFor')
        ]
      }),
      screenshotHeightThreshold: this.fb.control(60000, {
        nonNullable: false, validators: [
          Validators.min(1000),
          Validators.pattern('^[0-9]+$'),
          Validators.max(100000)
        ]
      }),
      imageDescriptionMinWordThreshold: this.fb.control(50, {
        nonNullable: false, validators: [
          Validators.min(5),
          Validators.pattern('^[0-9]+$'),
          Validators.max(4000)
        ]
      }),
      imageScoreThreshold: this.fb.control(3, {
        nonNullable: false, validators: [
          Validators.min(0),
          Validators.pattern('^[0-9]+$'),
          Validators.max(300)
        ]
      }),
      excludeExternalImages: this.fb.control(false, { nonNullable: true, validators: [] }),

      // Link and Domain Handling Parameters
      excludeSocialMediaDomains: this.fb.control("facebook",
        {
          nonNullable: false,
          validators: [
            includesStrings(['facebook', 'x', 'instagram', 'youtube', 'linkedin', 'tiktok', 'reddit', 'pinterest', "snapchat"]) // 3 - 60 characters
          ]
        }), //
      excludeExternalLinks: this.fb.control(false, { nonNullable: true, validators: [] }),
      excludeSocialMediaLinks: this.fb.control(false, { nonNullable: true, validators: [] }),
      excludeDomains: this.fb.control("ads.com",
        {
          nonNullable: false,
          validators: [
            excludeDomains() // 3 - 60 characters
          ]
        }) as FormControl<string | null>,

      // Debugging and Logging Parameters
      verbose: this.fb.control(true, { nonNullable: true, validators: [] }),
      logConsole: this.fb.control(false, { nonNullable: true, validators: [] }),

      // Other parameters with default values
    }
    )

  }

  getAndFilterConfirmForm(): CrawlerRunConfig {
    // get form values
    const config = this.configForm.getRawValue()
    const newConfig = { ...config }; // Create a copy of the config object
    delete newConfig.title; // Remove the 'title' attribute from the config object


    // Filter out null, unchanged, or default values
    const filteredConfig: CrawlerRunConfig = Object.keys(newConfig).reduce((acc: any, key) => {
      const formControl = this.configForm.get(key)

      if (formControl && (formControl.dirty || !formControl.pristine) && newConfig[key] !== null && newConfig[key] !== '') {
        if (key === 'cacheMode')
          acc[key] = newConfig[key]?.code
        else acc[key] = newConfig[key]
      } else if (!formControl && newConfig[key] !== null && newConfig[key] !== '') {
        if (key === 'cacheMode')
          acc[key] = newConfig[key]?.code
        else acc[key] = newConfig[key]
      }
      // console.log(acc, key)
      return acc
    }, {})

    return filteredConfig
  }

  private setCrawlConfiguration() {

    this.crawlConfigs$ = this.packService.crawlConfigs$

    setCacheModeList(this.cachModeOptions)

    this.configSelectedById = ''
  }

  onCacheModeSelect(event: Event) {
    // const selectedValue = (event.target as HTMLSelectElement).value;
    // this.configForm.get('cacheMode')?.setValue(null)
    // console.log('selectedValue', event, this.configForm.getRawValue())

    if (this.configForm.get('cacheMode')?.value?.code !== CrawlCachingMode.NONE)
      this.configForm.get('cacheMode')?.markAsDirty()
  }

  protected addCrawlConfig() {
    this.newConfigOpened = !this.newConfigOpened

    this.showSettings = this.newConfigOpened

    // remove the state of the selected config 
    this.configSelectedById = ''

    // reset saving state
    this.savingNewConfig = false

    // reset form to default values
    this.configForm.reset()
    console.log('reset form', this.configForm.valid, this.configForm.errors)
  }

  saveCrawlConfiguration() {

    // validate form before saving
    if (this.configForm.invalid)
      return

    // get form values
    const config: CrawlerRunConfig = this.getAndFilterConfirmForm()
    const newCrawlConfig: CrawlConfig = {
      title: this.configForm.get('title')?.value,
      config,
      created_At: Date.now(),
    }

    // console.log('newCrawlConfig', newCrawlConfig)

    // loading state
    this.savingNewConfig = true

    this.crawlConfigSubs = this.packService.storeCrawlConfig(newCrawlConfig)
      .subscribe({
        next: (res) => {
          //  console.log(res)
        },
        error: (err) => {
          console.log(err)
          // show snackbar Error
          this.showSnackbar(err || "", SnackBarType.error, '', 5000)
        },
        complete: () => {
          // reset the form
          this.savingNewConfig = false
          this.newConfigOpened = false
          this.showSettings = false
          this.newConfigOpened = false
          this.configForm.reset()
          // show snackbar Error
          this.showSnackbar('Crawler Configuration saved successfully.', SnackBarType.success, '', 5000)
        }
      })
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
      this.configForm.get('cacheMode')?.patchValue({ code: crawl.config.cacheMode, name: crawl.config.cacheMode?.toUpperCase() })
    } else {
      this.configSelectedById = ''
      this.configForm.reset()
    }

  }



  actionProfileClicked(event: Event, crawl: CrawlConfig) {
    event.stopPropagation() // prevent default behavior of outer div
    console.log(crawl)
  }


  addConfigPackToCart(event: Event, crawl: CrawlConfig) {

    event.stopPropagation() // prevent default behavior of outer div

    // add crawler pacakage item,the configuration Browser Profile, to the cart system
    this.cartService.addItemToCart({ crawlConfig: crawl }, 'crawl4ai')

    // on add to cart, update cart buttons
    this.packCart$ = this.cartService.getCart$.pipe(
      map(cart => cart?.crawlConfig)
    )
  }

  removeConfigPackFromCart(event: Event,) {
    event.stopPropagation() // prevent default behavior of outer div

    // remove crawler pacakage item,the configuration Browser Profile, from the cart system
    this.cartService.removeItemFromCart('crawlConfig')

    // one remove update cart buttons
    this.packCart$ = this.cartService.getCart$.pipe(
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
