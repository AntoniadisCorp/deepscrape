import { AsyncPipe, DatePipe, DOCUMENT, NgClass, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs/internal/observable/of';
import { map } from 'rxjs/internal/operators/map';
import { Subscription } from 'rxjs/internal/Subscription';
import { RadioToggleComponent, SnackBarType, StinputComponent } from 'src/app/core/components';
import { browserTitleValidator } from 'src/app/core/directives';

import { getErrorLabel, getOffsetTop } from 'src/app/core/functions';
import { FormControlPipe } from 'src/app/core/pipes';
import { CartService, PackService, ScrollService, SnackbarService, WindowToken } from 'src/app/core/services';
import { CrawlResult } from 'src/app/core/types';

@Component({
  selector: 'app-crawl-results',
  imports: [ReactiveFormsModule, MatIcon, NgClass, NgIf, AsyncPipe, NgIf,
    DatePipe, NgForOf, MatProgressSpinner, StinputComponent, FormControlPipe,
    RadioToggleComponent],
  templateUrl: './crawl-results.component.html',
  styleUrl: './crawl-results.component.scss'
})
export class CrawlResultsComponent {

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
  resultsForm: FormGroup
  private links: { id: string, label: string }[]
  protected activeLink: string | null = null
  protected showLink: boolean
  protected newConfigOpened: boolean
  protected savingNewConfig: boolean
  protected editMode: boolean
  protected showSettings: boolean
  protected configSelectedById: string | undefined
  protected crawlResults$: Observable<CrawlResult[] | null | undefined>
  protected totalResultPages$: Observable<number>
  protected inTotal$: Observable<number>

  protected packCart$: Observable<any>

  private crawlResultSubs: Subscription
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


    this.links = [{ id: 'controlling-each-crawl-result', label: 'Controlling Each Crawl Result' },
    { id: 'html-variants', label: 'HTML Variants' },
    { id: 'markdown-generation', label: 'Markdown Generation' },
    { id: 'structured-extraction', label: 'Structured Extraction' },
    { id: 'more-fields', label: 'More Fields like media links metadata' },
    ]

    this.crawlResults$ = of([])

    this.packCart$ = this.cartService.getCart$.pipe(
      map(cart => cart?.crawlResultConfig)
    )

    // set pack service with custom injectToken to be used on retrieving list of configurations by pagination
    this.packService = new PackService('crawlResults')
  }
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.initForm()
    this.setCrawlResults()

    // set toggle buttons
    this.showLink = this.showSettings = this.editMode = this.newConfigOpened = this.savingNewConfig = false
  }

  private initForm() {
    this.activeLink = ''

    this.resultsForm = this.fb.group({
      created_at: this.fb.control(null, { nonNullable: true }),
      // CrawlResults Configuration Title
      title: this.fb.control('', {
        nonNullable: true, validators: [
          Validators.required,
          browserTitleValidator()
        ]
      }),

      /* HTML Variants */
      html: this.fb.control(false, { nonNullable: true, validators: [] }),
      cleanedHtml: this.fb.control(false, { nonNullable: true, validators: [] }),

      /* Markdown Generation Results */
      rawMarkdown: this.fb.control(false, { nonNullable: true, validators: [] }),
      markdownWithCitations: this.fb.control(false, { nonNullable: true, validators: [] }),
      referencesMarkdown: this.fb.control(false, { nonNullable: true, validators: [] }), // you can check if only is available by citations=True
      fitMarkdown: this.fb.control(false, { nonNullable: true, validators: [] }), // if a content filter was used in crawler core Configuration
      fitHtml: this.fb.control(false, { nonNullable: true, validators: [] }),  // if a content filter was used in crawler core Configuration.


      /* Extracted Content Results*/
      extractedContent: this.fb.control(false, { nonNullable: true, validators: [] }), // if JSON-based extraction strategy was implemented in crawler core Configuration

      /* More Fields: Links, Media, and More */
      media: this.fb.control(false, { nonNullable: true, validators: [] }),
      links: this.fb.control(false, { nonNullable: true, validators: [] }),
      downloadFiles: this.fb.control(false, { nonNullable: true, validators: [] }),
      screenshot: this.fb.control(false, { nonNullable: true, validators: [] }),
      pdf: this.fb.control(false, { nonNullable: true, validators: [] }),
      metadata: this.fb.control(false, { nonNullable: true, validators: [] }),
      errorMessage: this.fb.control(false, { nonNullable: true, validators: [] }),
      sessionId: this.fb.control(false, { nonNullable: true, validators: [] }),
      responseHeaders: this.fb.control(false, { nonNullable: true, validators: [] }),
      sslCertificate: this.fb.control(false, { nonNullable: true, validators: [] }),

      // more
      // success: this.fb.control(false, { nonNullable: true, validators: [] }),
      // url:  this.fb.control(false, { nonNullable: true, validators: [] }),
      // statusCode: this.fb.control(false, { nonNullable: true, validators: [] }),


    })
  }
  getAndFilterConfirmForm(): any {
    // get form values
    const config = this.resultsForm.getRawValue()
    const newConfig = { ...config }; // Create a copy of the config object
    delete newConfig.title; // Remove the 'title' attribute from the config object
    delete newConfig.created_at; // Remove the 'created_at' attribute from the config object


    // Filter out null, unchanged, or default values
    const filteredConfig: any = Object.keys(newConfig).reduce((acc: any, key) => {
      const formControl = this.resultsForm.get(key)

      if (formControl && (formControl.dirty || !formControl.pristine) && newConfig[key] !== null && newConfig[key] !== '') {
        acc[key] = newConfig[key]
      } else if (!formControl && newConfig[key] !== null && newConfig[key] !== '') {
        acc[key] = newConfig[key]
      }
      // console.log(acc, key)
      return acc
    }, {})

    return filteredConfig
  }

  private setCrawlResults() {

    this.crawlResults$ = this.packService.crawlResults$

    this.configSelectedById = ''

    // setCacheModeList(this.cachModeOptions)
  }

  protected addNewCrawlResults() {
    this.newConfigOpened = !this.newConfigOpened

    this.showSettings = this.newConfigOpened

    // reset config selected state
    this.configSelectedById = ''

    // reset saving state
    this.savingNewConfig = false

    // reset form to default values
    this.resultsForm.reset()

    this.resultsForm.enable() // enable form
    // console.log('reset form', this.resultsForm.valid, this.resultsForm.errors)
  }
  onSelectCrawlResult(results: any) {
    // this.selectedProfile = profile
    // this.configForm.get('userDataDir')?.setValue(profile.path)

    if (this.newConfigOpened)
      this.newConfigOpened = false
    else {
      this.showSettings = this.configSelectedById === results.id? 
        !this.showSettings : true
    }

    if (this.showSettings) {
      this.configSelectedById = results.id
      
      this.setConfigFormFromInput(results)
      this.resultsForm.disable() // disable form
      
      // always reset editable when new profile selected
      this.editMode = false
    } else {
      this.configSelectedById = ''
      this.resultsForm.enable() // enable form
      this.resultsForm.reset()
    }

  }
  saveCrawlResultsConfig() {

    // validate form before saving
    if (this.resultsForm.invalid || (this.editMode && this.resultsForm.pristine))
      return
      
    this.resultsForm.disable();
      
    // get form values
    const config: any = this.getAndFilterConfirmForm()
    const now = Date.now();
    
    const newCrawlResultsConfig: any = {
      ...!this.editMode ? {} : {id: this.configSelectedById},
      title: this.resultsForm.get('title')?.value,
      config,
      ...!this.editMode ? {created_At: now} : {updated_At: now, created_At: this.resultsForm.get('created_at')?.value},
    }

    // console.log('newCrawlConfig', newCrawlConfig)

    // loading state
    this.savingNewConfig = true

    console.log('Saving CrawlResult Config...', newCrawlResultsConfig)

    this.crawlResultSubs = this.packService.storeCrawlResultConfig(newCrawlResultsConfig)
      .subscribe({
        next: (res) => {
          //  console.log(res)
        },        error: (err) => {
          console.log(err)
          this.savingNewConfig = false;
          // show snackbar Error
          this.showSnackbar(err || "", SnackBarType.error, '', 5000)
          this.resultsForm.enable();
        },complete: () => {
          // reset the form
          this.savingNewConfig = this.newConfigOpened = false;
          this.showSettings = false;
          
          if (!this.editMode)
            this.resultsForm.reset();
            
          this.resultsForm.enable();
          // show snackbar success
          this.showSnackbar('CrawlResult Config saved successfully.', SnackBarType.success, '', 5000)
        }
      })
  }

  actionProfileClicked(event: Event, crawl: any) {
    event.stopPropagation() // prevent default behavior of outer div
    console.log(crawl)
  }


  addConfigPackToCart(event: Event, config: any) {

    event.stopPropagation() // prevent default behavior of outer div

    // add crawler pacakage item,the configuration Browser Profile, to the cart system
    this.cartService.addItemToCart({ crawlResultConfig: config }, 'crawl4ai')

    // on add to cart, update cart buttons
    this.packCart$ = this.cartService.getCart$.pipe(
      map(cart => cart?.crawlResultConfig)
    )
  }

  removeConfigPackFromCart(event: Event) {
    event.stopPropagation() // prevent default behavior of outer div

    // remove crawler pacakage item,the configuration Browser Profile, from the cart system
    this.cartService.removeItemFromCart('crawlResultConfig')

    // one remove update cart buttons
    this.packCart$ = this.cartService.getCart$.pipe(
      map(cart => cart.crawlResultConfig)
    )
  }

  scrollTo(link: string) {
    this.activeLink = link
    const elem = this.document.getElementById(link) as HTMLElement
    if (elem)
      this.scroll.scrollToElementByOffset(this.document.getElementById(link) as HTMLElement, 10 * 16)

  }

  getActiveLink(scrollPosition: number, links: { id: string, label: string }[]): string | null {
    let activeLink: string | null = null
    let minDistance = Infinity;

    links.forEach((link) => {
      const element = this.document.getElementById(link.id)
      const extraFixedDistance = (link.id === 'controlling-each-crawl-result' || link.id === 'html-variants' ? -50 : link.id === 'structured-extraction' ? -20 : link.id === 'more-fields' ? -150 : 100)
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

  showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }

  getErrorLabel(controlName: string): string | undefined {
    return getErrorLabel(this.resultsForm, controlName)
  }
  ngOnDestroy(): void {
    this.crawlResultSubs?.unsubscribe()
  }

  protected makeEditable() {
    if (this.newConfigOpened)
      return

    this.editMode = !this.editMode

    if (this.editMode) {
      this.resultsForm.enable() // enable form
    } else {
      // refill the form with the selected profile values stored by configSelectedById
      this.crawlResults$.forEach(configs => {
        const config = configs?.find(c => c.id === this.configSelectedById)
        if (!config) return
        this.setConfigFormFromInput(config)
        return
      })
      this.resultsForm.disable() // disable form
      this.resultsForm.markAllAsTouched() // mark form
      this.resultsForm.markAsPristine() // mark form
    }
  }

  private setConfigFormFromInput(resultConfig: any) {
    this.resultsForm.get('title')?.setValue(resultConfig.title)
    this.resultsForm.get('created_at')?.setValue(resultConfig.created_At || null)
    this.resultsForm.patchValue(resultConfig.config)
  }
}
