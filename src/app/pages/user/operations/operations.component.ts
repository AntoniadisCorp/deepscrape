import { AsyncPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostBinding, ViewChild } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatIcon } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { RouterLink, Router } from '@angular/router'
import { distinct, distinctUntilChanged, Observable, of, refCount, Subject, Subscription, switchMap, tap } from 'rxjs'
import { DropdownComponent, GinputComponent, LoadingDotsComponent, PromptareaComponent, SnackBarType, StinputComponent } from 'src/app/core/components'
import { Outsideclick, RippleDirective } from 'src/app/core/directives'
import { CrawlOperationStatus } from 'src/app/core/enum'
import { crawlOperationStatusColor, isArray, setAIModel, setOperationStatusList } from 'src/app/core/functions'
import { FormControlPipe } from 'src/app/core/pipes'
import { AuthService, CrawlStoreService, ScrollService, SnackbarService } from 'src/app/core/services'
import { AIModel, CrawlConfig, CrawlOperation, Size } from 'src/app/core/types'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { provideNativeDateAdapter } from '@angular/material/core'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatTimepickerModule, provideNativeDateTimeAdapter } from '@dhutaryan/ngx-mat-timepicker'



@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, RippleDirective, MatIcon, NgClass, AsyncPipe,
    MatProgressBarModule, LoadingDotsComponent, StinputComponent, FormControlPipe,
    GinputComponent, DropdownComponent, RouterLink, PromptareaComponent,
    ReactiveFormsModule, MatFormFieldModule, Outsideclick, MatProgressSpinner,
    MatInputModule,
    MatTimepickerModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter(), provideNativeDateTimeAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operations.component.html',
  styleUrl: './operations.component.scss'
})
export class OperationsComponent {


  /* INPUT AND BUTS VARIABLES IN ACTION */
  @HostBinding('class') classes = 'grow';
  @ViewChild("searchBar") searchBar!: ElementRef

  url: FormControl<string>
  modelAI: FormControl<AIModel>

  model: AIModel[] = []

  crawlPack: FormControl<Size | null>

  // retrieves data dynamically from server
  crawlConfigPack: Size[] = []
  userprompt: FormControl<string>
  submitButton: FormControl<boolean>
  operationName: FormControl<string>

  operationStatus: FormControl<Size>
  operStatusList: Size[] = []

  loadingOperList: boolean = false

  datePick: FormControl<Date | null>
  minDate: Date
  timePick: FormControl<Date | null>

  minTime: Date
  addScrapperBtn: boolean

  protected operations$: Observable<CrawlOperation[] | null | undefined>
  protected totalOpePages$: Observable<number>
  protected inTotal$: Observable<number>

  // deletedCount = 4
  // canceledCount = 6

  // failedCount = 6



  // scheduledCount = 6

  // processingCount = 3

  // notStartedCount = 2

  // savedResultsCount = 2


  // urlsUsedCount = 10


  // statusColor: string


  protected operationsForm: FormGroup

  private destroy$ = new Subject<void>()
  private crawlSubs: Subscription
  private pagesSubs: Subscription

  protected totalOperPerPage: number

  protected currentOpePage: number = 1
  protected operOptions: { menu_visible: boolean, id: string }[] = []

  protected isOperOptionsLoading: boolean

  constructor(private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private authService: AuthService,
    private crawlStoreService: CrawlStoreService,
    private snackbarService: SnackbarService,

    private scroll: ScrollService,
  ) {
    this.initVariables()
    this.initFormBuilders()
    this.initOperations()


  }

  private initVariables() {

    this.addScrapperBtn = false

    this.url = new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
      ]
    },)

    this.modelAI = new FormControl<Size>({ name: 'claude-3-5-haiku-20241022', code: "claude" }, {
      // updateOn: 'blur', //default will be change
      nonNullable: true,
      validators: [
        Validators.required,
        // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
      ]
    })

    setAIModel(this.model)

    this.crawlPack = new FormControl<Size | null>(null, {
      // updateOn: 'blur', //default will be change
      nonNullable: false,
      validators: [
        // Validators.required,
        // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
      ]
    })
    // { name: 'CrawlConfig2', code: "crawlpack-track-id-2" }, { name: 'CrawlConfig3', code: "crawlpack-track-id-3" }
    // this.crawlConfigPack.push()

    /* 
      Prompt Form 
     */

    this.operationStatus = new FormControl<Size>({
      name: "Save",
      code: CrawlOperationStatus.READY
    }, {
      // updateOn: 'blur', //default will be change
      nonNullable: true,
      validators: [
        Validators.required,
        // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
      ]
    })

    setOperationStatusList(this.operStatusList)

    this.userprompt = new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
      ]
    })

    this.submitButton = new FormControl<boolean>(false, {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })

    this.operationName = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })

    this.datePick = new FormControl<Date | null>(null, {
      updateOn: 'blur', //default will be change
      nonNullable: false,
      validators: [
        Validators.required
      ]
    })

    this.timePick = new FormControl<Date | null>(null, {

      nonNullable: false,
      validators: [
        Validators.required,
      ]
    })
    const date = new Date()
    this.minDate = date

  }

  private initFormBuilders() {
    this.operationsForm = this.fb.group({
      search: ['', {
        validators: []
      }],
      filters: [''],
    })
  }

  private padZero(value: number): string {
    return value < 10 ? `0${value}` : `${value}`
  }
  protected get search() {
    return this.operationsForm.get('search')
  }
  initOperations() {

    this.operations$ = this.crawlStoreService.operations$
    this.totalOpePages$ = this.crawlStoreService.totalPages$
    this.inTotal$ = this.crawlStoreService.inTotal$

    this.totalOperPerPage = 10 // set a default value and update it later based on the user selection or local storage
    this.isOperOptionsLoading = false

    // create a new array of n items
    for (let i = 0; i < this.totalOperPerPage; i++) {
      this.operOptions.push({
        menu_visible: false,
        id: `${i + 1}`,
      })
    }

    /* this.addOperation({
      authorId: "George Konstantine",
      created_At: Date.now(),
      name: "Create docs embeddings for given urls",
      urls: ["https://akispetretzikis.com/recipe/8615/revithada-me-chwriatiko-loukaniko"],
      sumPrompt: `create a most beautifull custom table not html tabe, for example alist of box operations 
      with tailwind dark and light mode in angular where each operation has date created author name actions 
      operation name summerized prompt urls use outer boxes in each light or dark mode`,
      status: CrawlOperationStatus.READY,
      color: crawlOperationStatusColor(CrawlOperationStatus.READY),

    }) */

  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

  }

  protected refreshOperationList() {

    // loading Operation List
    this.loadingOperList = true

    // make the request via Firestore Functions
    this.crawlStoreService.nextPage(this.currentOpePage)

    // scroll to the search bar target in the page
    this.scroll.scrollToElement(this.searchBar.nativeElement as HTMLElement)

    setTimeout(() => {
      // loading Operation List
      this.loadingOperList = false
    }, 400)
  }

  private prepareCrawlOperation(operation: CrawlOperation) {

    // store the operation to firestore database
    this.crawlSubs = this.crawlStoreService.storeCrawlOperation(
      operation.author.uid,
      operation
    )
      .subscribe({
        next: (done) => {
          console.log('done', done)
        },
        error: (error) => {
          console.log('error', error)
        },
        complete: () => {
          this.enableForm()
        }
      })


  }



  getOperation(operation: CrawlOperation): string | string[] {
    return this.isArray(operation.urls) ? operation.urls[0] : operation.urls
  }


  // addOperation(data: CrawlOperation) {
  //   // this.operations.push(data)
  // }

  deleteOperation(operation: CrawlOperation, indexOption: number) {

    if (!operation.id)
      return

    if (operation.author.uid !== this.authService.user?.uid)
      return

    this.isOperOptionsLoading = true

    this.crawlStoreService.deleteCrawlOperation(operation.author.uid,
      operation.id, this.currentOpePage, this.totalOperPerPage)
      .subscribe({
        next: (done: any) => {
          // console.log('done', done)
          this.showSnackbar('Operation deletion successful', SnackBarType.success, '', 5000)
        },
        error: (error: any) => {
          console.log('error', error)
          this.showSnackbar('Operation deletion failed. Please try again later', SnackBarType.error, '', 5000)
        },
        complete: () => {
          this.isOperOptionsLoading = false
          this.operOptions[indexOption].menu_visible = false
        }
      })
  }


  toggleMenuVisible(event: Event, index: number) {
    /* const element = event.target as HTMLElement
    console.log(element, element.parentElement && element.parentElement.matches('button'), element.matches('button'))
    if (this.operOptions[index].menu_visible &&
      (element.parentElement && element.parentElement.matches('button') || element.matches('button')))
      return */

    // remove the menu visible from all the other options
    for (let i = 0; i < this.operOptions.length; i++) {
      if (i !== index) {
        this.operOptions[i].menu_visible = false
      }
    }

    this.operOptions[index].menu_visible = !this.operOptions[index].menu_visible
  }

  closeOptions(event: Event, index: number) {

    const element = event.target as HTMLElement

    if (this.operOptions[index].menu_visible &&
      (element.parentElement && element.parentElement.matches('button') || element.matches('button')))
      return

    if (!this.operOptions[index].menu_visible) return

    this.operOptions[index].menu_visible = false
    this
  }


  isArray(arr: string | string[]): boolean {

    return isArray(arr) && arr.length > 1
  }

  /* INPUT & BUTTONS ACTIONS */

  protected setDateTime() {
    if (!this.datePick.value) return

    console.log('setDateTime')
    const date = this.datePick.value
    const currentTime = new Date()

    // Check if the selected date is today
    if (date.getUTCFullYear() === currentTime.getUTCFullYear() &&
      date.getUTCMonth() === currentTime.getUTCMonth() &&
      date.getUTCDate() === currentTime.getUTCDate()) {
      // Set the minimum time to the current time
      this.minTime = currentTime
    } else {
      // Set the minimum time to 00:00 if the selected date is not today
      this.minTime = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }

    // Set the time picker value to the current time
    this.timePick.setValue(currentTime)
  }

  protected setTime() {
    if (!this.timePick.value)
      return


    const selectedDate = this.timePick.value
    const today = new Date()

    // Check if the selected date is today
    const isToday = selectedDate.toDateString() === today.toDateString()

    console.log('isToday', isToday)
    // Set the minimum time if the selected date is today
    if (isToday) {
      this.minTime = today
    } else {
      // Set the minimum time to 00:00 if the selected date is not today
      this.minTime = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    }
  }

  protected onClearText() {
    this.operationName.setValue('')
    this.operationStatus.setValue(this.operationStatus.defaultValue)
    this.url.setValue('')
    this.userprompt.setValue('')
  }

  protected abortRequests() {

    // Emit a signal to cancel the request
    this.destroy$.next()
    // this.isResultsProcessing = this.isCrawlProcessing = false
    // this.enableForm()
    this.showSnackbar('Request canceled', SnackBarType.info, '', 5000)
  }

  protected onPromptSubmited(prompt: string) {

    // return an error message if url or userpormpt is invalid
    if (!this.url.valid || !this.userprompt.valid
      || !this.modelAI.valid || !this.operationName.valid
      || (this.operationStatus.value.code === CrawlOperationStatus.SCHEDULED &&
        (!this.datePick.valid || !this.timePick.valid))) {
      this.showSnackbar('Invalid input', SnackBarType.error, '', 5000)
      return
    }


    // Setup the crawl operation urls
    let URLs: string = this.url.value

    const arrURL: string[] = URLs.split(',')

    const scheduled_At = this.timePick.value?.getTime() || Date.now()

    // setup the crawl operation
    const operationData: CrawlOperation = {
      author: { uid: this.authService.user?.uid || '', displayName: this.authService.user?.displayName || '' },
      modelAI: this.modelAI.value as AIModel,
      created_At: Date.now(),
      name: this.operationName.value,
      urls: arrURL,
      sumPrompt: this.userprompt.value, // 
      scheduled_At,  // 30 * 60 * 1000
      status: this.operationStatus.value.code as CrawlOperationStatus,
      color: crawlOperationStatusColor(this.operationStatus.value.code as CrawlOperationStatus),
      // metadata: this.crawlPack.value,
      // metadata: {
      //   crawler: {
      //     waitUntil: 'networkidle',
      //   },
      //   browser: {
      //     cssSelector: '',
      //   }

      // }
    }

    // console.log(operationData)
    // this.addOperation(operationData)

    // reset the results
    // this.closeResults()

    // disable the form
    this.disableForm()

    // save the Crawl operation
    this.prepareCrawlOperation(operationData)
  }

  private enableForm() {

    this.url.enable()
    this.userprompt.enable()
    this.submitButton.setValue(false)
    this.modelAI.enable()
  }

  private disableForm() {
    this.url.disable()
    this.userprompt.disable()
    this.submitButton.setValue(true)
    this.modelAI.disable()
  }


  protected onDropDownSelected_Status($event: any) {
    // throw new Error('Method not implemented.')
    console.log($event)
  }
  protected onDropDownSelected($event: any) {
    // throw new Error('Method not implemented.')
  }

  protected onDataLinkChange(event: Event) {
    // const input = event.target as EventTarget & HTMLInputElement

    // go to the focus to the next text input, textarea
  }

  protected toggleScrapperBtn() {
    this.addScrapperBtn = !this.addScrapperBtn
  }

  protected onPageChanged(page: number, totalOpePages: number) {

    // if the page is the same as the current page, return
    if (page == 1 && page == totalOpePages || (this.currentOpePage == page))
      return

    // set the currentOpePage
    this.currentOpePage = page

    // make the request via Firestore Functions
    this.crawlStoreService.nextPage(this.currentOpePage)

    // scroll to the search bar target in the page
    this.scroll.scrollToElement(this.searchBar.nativeElement as HTMLElement)

  }


  // 'info' | 'success' | 'warning' | 'error'
  private showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }

  Array(totalPages: number) {
    return Array(totalPages).fill(0).map((_, i) => i + 1)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.destroy$.next()
    this.destroy$.complete()
    this.crawlSubs?.unsubscribe()
    this.pagesSubs?.unsubscribe()
  }
}
