import { AsyncPipe, DatePipe, DOCUMENT, JsonPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, inject, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { map, Observable, of, Subscription } from 'rxjs';
import { DropdownComponent, RadioToggleComponent, SnackBarType, StinputComponent } from 'src/app/core/components';
import { browserTitleValidator, browserTypeValidator, cookieValidator, extraArgsValidator, headersValidator, proxyValidator, userAgentValidator, viewportDimensionValidator } from 'src/app/core/directives';
import { BrowserType } from 'src/app/core/enum';
import { getErrorLabel, getOffsetTop, setBrowserTypeList } from 'src/app/core/functions';
import { FormControlPipe } from 'src/app/core/pipes';
import { CartService, PackService, ScrollService, SnackbarService, WindowToken } from 'src/app/core/services';
import { BrowserConfig, BrowserProfile, Cookies, Headers, ProxyConfig, Size } from 'src/app/core/types';

@Component({
  selector: 'app-browser-config',
  standalone: true,
  imports: [ReactiveFormsModule, MatIcon, NgClass, NgIf, NgFor, AsyncPipe, DatePipe,
    RadioToggleComponent, FormControlPipe, StinputComponent, JsonPipe,
    DropdownComponent, MatProgressSpinner,
  ],
  templateUrl: './browser-config.component.html',
  styleUrl: './browser-config.component.scss'
})
export class BrowserConfigComponent {
  private window = inject(WindowToken)
  @HostListener('window:scroll', ['$event'])
  onScroll(event: any) {
    const scrollPosition = window.scrollY
    const links = this.links
    const activeLink = this.getActiveLink(scrollPosition, links)
    if (activeLink !== this.activeLink && activeLink)
      this.activeLink = activeLink
  }

  configForm: FormGroup

  private links: { id: string, label: string }[]
  protected activeLink: string | null = null
  protected showLink: boolean
  protected newProfileOpened: boolean
  protected savingNewProfile: boolean
  protected showSettings: boolean

  protected profileSelectedById: string | undefined

  browserTypeOptions: Size[] = []

  protected browserProfiles$: Observable<BrowserProfile[] | null | undefined>

  protected totalProfilePages$: Observable<number>
  protected inTotal$: Observable<number>


  protected packCart$: Observable<any>

  private browseSubs: Subscription
  private packService: PackService
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private scrollService: ScrollService,

    private cartService: CartService,


    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.links = [{ id: 'controlling-each-browser', label: 'Controlling Each Browser' },
    { id: 'browser-settings', label: 'Browser Basic Settings' },
    { id: 'browser-userdata', label: 'Browser Storage Settings' },
    ]
    this.browserProfiles$ = of([])
    this.packCart$ = this.cartService.getCart().pipe(
      map(cart => cart?.browserProfile)
    )

    // set pack service with custom injectToken to be used on retrieving list of configurations by pagination
    this.packService = new PackService('browserProfiles')


  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.initForm()
    this.setBrowserProfiles()

    // set toggle buttons
    this.showLink = this.showSettings = this.newProfileOpened = this.savingNewProfile = false
  }

  ngAfterViewInit(): void {
    //Called after ngOnInit when the component's or directive's content has been initialized.
    //Add 'implements AfterContentInit' to the class.
    this.scrollIntoView()
    this.cdr.detectChanges()
  }

  get browserType() {
    return this.configForm.get('browserType') as FormControl<Size>
  }

  private initForm() {
    this.activeLink = ''

    this.configForm = this.fb.group({
      // Browser Profile Title
      title: this.fb.control('', {
        nonNullable: true, validators: [
          Validators.required,
          browserTitleValidator()
        ]
      }),

      // Browser Type
      browserType: this.fb.control(
        {
          name: BrowserType.Chromium.toUpperCase(),
          code: BrowserType.Chromium.toLowerCase()
        }, { // Default value
        nonNullable: true,
        validators: [
          Validators.required,
          browserTypeValidator(),
        ],
      }) as FormControl<Size>,

      // Boolean Parameters
      headless: this.fb.control(true, { nonNullable: true, validators: [Validators.required] }),

      // ViewPort Parameters
      viewportHeight: this.fb.control(
        600,
        {
          nonNullable: true,
          validators: [
            viewportDimensionValidator(100, 4000),
          ],
        },
      ),
      viewportWidth: this.fb.control(
        1080,
        {
          nonNullable: true,
          validators: [
            viewportDimensionValidator(100, 4000),
          ],
        },
      ),

      // Define other controls similarly
      lightMode: this.fb.control(false, { nonNullable: true, validators: [] }),
      textMode: this.fb.control(false, { nonNullable: true, validators: [] }),
      userManagedBrowser: this.fb.control(false, { nonNullable: true, validators: [] }),
      javaScriptEnabled: this.fb.control(true, { nonNullable: true, validators: [] }),
      ignoreΗttpsΕrrors: this.fb.control(true, { nonNullable: true, validators: [] }),

      // Directory to store user data (profiles, cookies, sessions, etc.)
      usePersistentContext: this.fb.control(false, { nonNullable: true, validators: [] }),
      userDataDir: this.fb.control(null, {
        nonNullable: false,
        validators: [
        ]
      }) as FormControl<string | null>,
      // User Data Parameters
      userAgent: this.fb.control(null, {
        nonNullable: false, validators: [
          userAgentValidator(),
        ]
      }) as FormControl<string | null>,
      cookies: this.fb.control(
        null,
        {
          nonNullable: false,
          validators: [
            cookieValidator(),
          ],
        },
      ) as FormControl<Cookies | null>,
      /* 
      [{  
        "key": "User-Agent",
        "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.3"
      }]
      */
      headers: this.fb.control(
        null,
        {
          nonNullable: false,
          validators: [
            headersValidator(),
          ],
        },
      ) as FormControl<Headers | null>,

      // Proxy Parameters
      proxy: this.fb.control(
        null,
        {
          nonNullable: false,
          validators: [
            proxyValidator(),
          ],
        },
      ),
      // FIXME: proxyConfig its not ready yet
      proxyConfig: this.fb.control(null as ProxyConfig | null, { nonNullable: false }),

      // Extra Arguments
      extraArgs: this.fb.control(
        null,
        {
          nonNullable: false,
          validators: [
            extraArgsValidator(),
          ],
        },
      ),

      /*
      cdp_url (str): URL for the Chrome DevTools Protocol (CDP) endpoint. Default: "ws://localhost:9222/devtools/browser/".
        debugging_port (int): Port for the browser debugging protocol. Default: 9222.

        chrome_channel (str): The Chrome channel to launch (e.g., "chrome", "msedge"). Only applies if browser_type
                              is "chromium". Default: "chromium".
        channel (str): The channel to launch (e.g., "chromium", "chrome", "msedge"). Only applies if browser_type
                              is "chromium". Default: "chromium".
      accept_downloads (bool): Whether to allow file downloads. If True, requires a downloads_path.
                                 Default: False.
        downloads_path (str or None): Directory to store downloaded files. If None and accept_downloads is True,
                                      a default path will be created. Default: None. 
        storage_state (str or dict or None): Path or object describing storage state (cookies, localStorage).
                Default: None.*/
    })
  }

  getAndFilterConfirmForm(): BrowserConfig {
    // get form values
    const config = this.configForm.getRawValue()
    const newConfig = { ...config }; // Create a copy of the config object
    delete newConfig.title; // Remove the 'title' attribute from the config object


    // Filter out null, unchanged, or default values
    const filteredConfig: BrowserConfig = Object.keys(newConfig).reduce((acc: any, key) => {
      const formControl = this.configForm.get(key)

      if (formControl && (formControl.dirty || !formControl.pristine) && newConfig[key] !== null && newConfig[key] !== '') {
        if (key === 'browserType')
          acc[key] = newConfig[key]?.code
        else acc[key] = newConfig[key]
      } else if (!formControl && newConfig[key] !== null && newConfig[key] !== '') {
        if (key === 'browserType')
          acc[key] = newConfig[key]?.code
        else acc[key] = newConfig[key]
      }
      // console.log(acc, key)
      return acc
    }, {})

    return filteredConfig
  }

  private setBrowserProfiles() {

    this.browserProfiles$ = this.packService.browserProfiles$
    setBrowserTypeList(this.browserTypeOptions)
    this.profileSelectedById = ''
  }


  addBrowserProfile() {

    this.newProfileOpened = !this.newProfileOpened

    this.showSettings = this.newProfileOpened

    // reset saving state
    this.savingNewProfile = false

    // reset form to default values
    this.configForm.reset()
  }
  /**
   * TODO: comment saveBrowserProfile
   * @description Saves browser profile to the database
   */
  saveBrowserProfile() {

    // validate form before saving
    if (this.configForm.invalid)
      return

    // get form values
    const config = this.getAndFilterConfirmForm()
    const newProfile: BrowserProfile = {
      title: this.configForm.get('title')?.value,
      config,
      created_At: Date.now(),
    }

    // loading state
    this.savingNewProfile = true

    this.browseSubs = this.packService.storeBrowserProfile(newProfile)
      .subscribe({
        next: (res) => {
          console.log(res)
        },
        error: (err) => {
          console.log(err)
          // show snackbar Error
          this.showSnackbar(err || "", SnackBarType.error, '', 5000)
        },
        complete: () => {
          // reset the form
          this.savingNewProfile = false
          this.newProfileOpened = false
          this.showSettings = false
          this.savingNewProfile = false
          this.configForm.reset()
          // show snackbar Error
          this.showSnackbar('Browser profile saved successfully.', SnackBarType.success, '', 5000)
        }
      })
  }

  onBrowserTypeSelect(event: Size) {
    // const selectedValue = event as Size
    // this.configForm.get('browserType')?.setValue(selectedValue)
    // console.log(selectedValue)

    if (this.browserType?.value?.code !== BrowserType.Chromium)
      this.browserType?.markAsDirty()
  }

  onSelectProfile(profile: BrowserProfile) {
    // this.selectedProfile = profile
    // this.configForm.get('userDataDir')?.setValue(profile.path)

    if (this.newProfileOpened)
      this.newProfileOpened = false
    else
      this.showSettings = true

    if (this.showSettings) {
      this.profileSelectedById = profile.id
      this.configForm.get('title')?.setValue(profile.title)

      // set form values
      this.configForm.patchValue(profile.config)
      this.browserType.patchValue({ code: profile.config.browserType, name: profile.config.browserType?.toUpperCase() })
    } else {
      this.profileSelectedById = ''
      this.configForm.reset()
    }

  }

  actionProfileClicked(event: Event, profile: BrowserProfile) {
    event.stopPropagation() // prevent default behavior of outer div
    console.log(profile)
  }

  addPackToCart(event: Event, profile: BrowserProfile) {

    event.stopPropagation() // prevent default behavior of outer div

    // add crawler pacakage item,the configuration Browser Profile, to the cart system
    this.cartService.addItemToCart({ browserProfile: profile })

    // on add to cart, update cart buttons
    this.packCart$ = this.cartService.getCart().pipe(
      map(cart => cart?.browserProfile)
    )
  }

  removePackFromCart(event: Event,) {
    event.stopPropagation() // prevent default behavior of outer div

    // remove crawler pacakage item,the configuration Browser Profile, from the cart system
    this.cartService.removeItemFromCart('browserProfile')

    // one remove update cart buttons
    this.packCart$ = this.cartService.getCart().pipe(
      map(cart => cart?.browserProfile)
    )
  }

  scrollTo(link: string) {
    this.activeLink = link
    const elem = this.document.getElementById(link) as HTMLElement
    if (elem)
      this.scrollService.scrollToElementByOffset(this.document.getElementById(link) as HTMLElement, 10 * 16)
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
      const extraFixedDistance = 200
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
    return getErrorLabel(this.configForm, controlName)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.browseSubs?.unsubscribe()
  }

}
