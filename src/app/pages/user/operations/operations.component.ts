import { AsyncPipe, DatePipe, DecimalPipe, JsonPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostBinding, SimpleChanges, ViewChild } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { FirestoreService } from 'src/app/core/services'
import { MatIcon } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { RouterLink, Router, ActivatedRoute } from '@angular/router'
import { BehaviorSubject, combineLatest, map, Observable, of, Subject, Subscription, tap, timer } from 'rxjs'
import { DropdownComponent, GinputComponent, LoadingDotsComponent, PromptareaComponent, SnackBarType, StinputComponent } from 'src/app/core/components'
import { Outsideclick, RippleDirective } from 'src/app/core/directives'
import { CrawlOperationStatus } from 'src/app/core/enum'
import { crawlOperationStatusColor, isArray, setAIModel, setOperationStatusList } from 'src/app/core/functions'
import { FormControlPipe } from 'src/app/core/pipes'
import { AuthService, CacheService, CrawlStoreService, ScrollService, SnackbarService, TaskStatus, WebSocketService } from 'src/app/core/services'
import { AIModel, CrawlConfig, CrawlOperation, DropDownOption, Users } from 'src/app/core/types'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { provideNativeDateAdapter } from '@angular/material/core'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatTimepickerModule, provideNativeDateTimeAdapter } from '@dhutaryan/ngx-mat-timepicker'
import { UserInfo } from '@angular/fire/auth'
import { listStaggerAnimation } from 'src/app/animations'
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  documentId,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  writeBatch,
} from '@angular/fire/firestore'

type OperationPageCursor = {
  createdAt: number
  docId: string
}



@Component({
  selector: 'app-operations',
  imports: [DatePipe, RippleDirective, MatIcon, NgClass, AsyncPipe, MatProgressBarModule, LoadingDotsComponent, StinputComponent, FormControlPipe, GinputComponent, DropdownComponent, RouterLink, PromptareaComponent, ReactiveFormsModule, MatFormFieldModule, Outsideclick, MatProgressSpinner, MatInputModule, DecimalPipe, MatTimepickerModule, MatDatepickerModule],
  providers: [provideNativeDateAdapter(), provideNativeDateTimeAdapter()],
  animations: [listStaggerAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operations.component.html',
  styleUrl: './operations.component.scss'
})
export class OperationsComponent {
  private readonly db: Firestore
  private readonly operationsSubject = new BehaviorSubject<CrawlOperation[] | null | undefined>(undefined)
  private readonly totalPagesSubject = new BehaviorSubject<number>(1)
  private readonly inTotalSubject = new BehaviorSubject<number>(0)
  private readonly pageCursorCacheNamespace = 'operations:lastDocByPage'



  private user: Users & { currProviderData: UserInfo | null } | null = null
  /* INPUT AND BUTS VARIABLES IN ACTION */
  @HostBinding('class') classes = 'grow';
  @ViewChild("searchBar") searchBar!: ElementRef

  url: FormControl<string>
  modelAI: FormControl<AIModel>

  model: AIModel[] = []

  crawlPack: FormControl<DropDownOption | null>

  // retrieves data dynamically from server
  crawlConfigPack: DropDownOption[] = []
  userprompt: FormControl<string>
  submitButton: FormControl<boolean>
  operationName: FormControl<string>

  operationStatus: FormControl<DropDownOption>
  operStatusList: DropDownOption[] = []

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
  private timerSubs: Subscription

  protected totalOperPerPage: number

  protected currentOpePage: number = 1
  protected operOptions: { menu_visible: boolean, id: string }[] = []

  protected isOperOptionsLoading: boolean
  private taskStatuses: TaskStatus[] = []
  private _seenTaskIds: Set<string> = new Set<string>()

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private cacheService: CacheService,
    private authService: AuthService,
    private crawlStoreService: CrawlStoreService,
    private snackbarService: SnackbarService,
    private scroll: ScrollService,

    private wsService: WebSocketService
  ) {
    this.db = this.firestoreService.getInstanceDB('easyscrape')
    this.initVariables()
    this.initFormBuilders()
    this.initOperations()


  }

  private initVariables() {

    this.user = this.route.snapshot.data['user'];

    this.addScrapperBtn = false

    this.url = new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
      ]
    },)

    this.modelAI = new FormControl<DropDownOption>({ name: 'claude-3-5-haiku-20241022', code: "claude" }, {
      // updateOn: 'blur', //default will be change
      nonNullable: true,
      validators: [
        Validators.required,
        // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
      ]
    })

    setAIModel(this.model)

    this.crawlPack = new FormControl<DropDownOption | null>(null, {
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

    this.operationStatus = new FormControl<DropDownOption>({
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

    // Subscribe to task status updates
    this.wsService.taskStatus$
      .subscribe(
        statuses => {
          this.taskStatuses = statuses;

          // Track new non-final statuses for one-time refresh
          if (!this._seenTaskIds) this._seenTaskIds = new Set<string>();
          let shouldRefresh = false;

          for (const s of statuses) {
            if (!s.final && !this._seenTaskIds.has(s.task_id)) {
              this._seenTaskIds.add(s.task_id);
              shouldRefresh = true;
            }
          }

          if (shouldRefresh) {
            this.refreshOperationList()
          }

          // At the end, if all statuses are final, refresh
          if (statuses.length > 0 && statuses.every(s => s.final)) {
            this.refreshOperationList()
            // Optionally clear seenTaskIds for next batch
            this._seenTaskIds.clear()
          }
        }
      )


    // Combine operations$ and taskStatus$
    this.operations$ = combineLatest([
      this.operationsSubject.asObservable(),
      this.wsService.taskStatus$
    ]).pipe(
      map(([operations, statuses]) => {
        if (!operations) return operations;
        // Map each operation and update its status if found in statuses
        return operations.map((op: CrawlOperation) => {
          const taskStatus = statuses.find((ts: any) => ts.task_id === op.task_id);
          if (taskStatus) {
            return {
              ...op,
              status: taskStatus.status as CrawlOperationStatus,
              color: crawlOperationStatusColor(taskStatus.status as CrawlOperationStatus)
            }
          }
          return op
        })
      }),
      tap((operations: CrawlOperation[] | null | undefined) => {
        if (!operations || operations.length === 0) {
          return
        }
        // Connect to websocket for active tasks
        const taskIds = operations
          .filter(op => op.status !== CrawlOperationStatus.COMPLETED &&
            op.status !== CrawlOperationStatus.FAILED &&
            op.status !== CrawlOperationStatus.CANCELED)
          .map(op => op.task_id)
          .filter((taskId): taskId is string => !!taskId) // Type guard to filter out undefined/null taskIds
        this.connectToTaskWebSocket(taskIds)
      }),
      map((operations) => operations)
    )

    this.totalOpePages$ = this.totalPagesSubject.asObservable()
    this.inTotal$ = this.inTotalSubject.asObservable()

    this.totalOperPerPage = 10 // set a default value and update it later based on the user selection or local storage
    this.isOperOptionsLoading = false

    // create a new array of n items
    for (let i = 0; i < this.totalOperPerPage; i++) {
      this.operOptions.push({
        menu_visible: false,
        id: `${i + 1}`,
      })
    }

    void this.loadOperationsPage(1, true)
  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   if (changes['taskIds'] && !changes['taskIds'].firstChange) {
  //     this.connectToTaskWebSocket();
  //   }
  // }

  private connectToTaskWebSocket(taskIds: string[] | undefined): void {
    if (!taskIds || taskIds.length === 0)
      return

    this.wsService.connectAndTrackTasks(taskIds)
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
  }

  protected refreshOperationList() {

    // loading Operation List
    this.loadingOperList = true

    void this.loadOperationsPage(this.currentOpePage, true)

    // scroll to the search bar target in the page
    if (this.searchBar.nativeElement)
      this.scroll.scrollToElement(this.searchBar.nativeElement as HTMLElement)

    // Keep the existing delayed-loading UX cadence
    this.timerSubs = timer(400).subscribe(() => {
      this.loadingOperList = false;
      this.cdr.markForCheck()
    })
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
          this.refreshOperationList()
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

    if (operation.author.uid !== this.user?.uid)
      return

    this.isOperOptionsLoading = true

    const ownerId = operation.author.uid
    const operationId = operation.id

    const operationRef = doc(this.db, `users/${ownerId}/operations/${operationId}`)
    const operationMetricsRef = doc(this.db, `operation_metrics/${operationId}`)
    const batch = writeBatch(this.db)

    batch.set(operationMetricsRef, { deleted_At: Date.now(), softDelete: true }, { merge: true })
    batch.delete(operationRef)

    batch.commit()
      .then(async () => {
        this.showSnackbar('Operation deletion successful', SnackBarType.success, '', 5000)
        this.resetOperationsPaginationCache()
        await this.loadOperationsPage(this.currentOpePage, true)
      })
      .catch((error: any) => {
        console.log('error', error)
        this.showSnackbar('Operation deletion failed. Please try again later', SnackBarType.error, '', 5000)
      })
      .finally(() => {
        this.isOperOptionsLoading = false
        this.operOptions[indexOption].menu_visible = false
        this.cdr.markForCheck()
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
      author: { uid: this.user?.uid || '', displayName: this.user?.currProviderData?.displayName || '' },
      modelAI: this.modelAI.value as AIModel,
      created_At: Date.now(),
      name: this.operationName.value,
      urls: arrURL,
      type: 'operation',
      prompt: this.userprompt.value, // 
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

    void this.loadOperationsPage(this.currentOpePage)

    // scroll to the search bar target in the page
    this.scroll.scrollToElement(this.searchBar.nativeElement as HTMLElement)

  }


  getVisiblePageNumbers(totalPages: number): number[] {
    // When we have 7 or fewer pages, just return all pages
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // For more than 7 pages, we'll show a sliding window of 5 pages
    let startPage = Math.max(2, this.currentOpePage - 2);
    let endPage = Math.min(totalPages - 1, this.currentOpePage + 2);

    // Adjust the window to always show 5 pages when possible
    if (this.currentOpePage <= 4) {
      endPage = 6;
    } else if (this.currentOpePage >= totalPages - 3) {
      startPage = totalPages - 5;
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  }
  // 'info' | 'success' | 'warning' | 'error'
  private showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }

  private async loadOperationsPage(page: number, forceCountRefresh = false): Promise<void> {
    if (!this.user?.uid) {
      this.operationsSubject.next([])
      this.totalPagesSubject.next(1)
      this.inTotalSubject.next(0)
      this.currentOpePage = 1
      this.cdr.markForCheck()
      return
    }

    try {
      if (forceCountRefresh || this.inTotalSubject.value === 0) {
        const countSnap = await getCountFromServer(collection(this.db, `users/${this.user.uid}/operations`))
        const total = countSnap.data().count || 0
        this.inTotalSubject.next(total)
        this.totalPagesSubject.next(Math.max(1, Math.ceil(total / this.totalOperPerPage)))
      }

      const totalItems = this.inTotalSubject.value
      const totalPages = this.totalPagesSubject.value

      if (totalItems === 0) {
        this.currentOpePage = 1
        this.operationsSubject.next([])
        this.cdr.markForCheck()
        return
      }

      const safePage = Math.min(Math.max(page, 1), totalPages)
      const previousCursor = await this.getOperationsPageStartCursor(safePage)
      const operationsRef = collection(this.db, `users/${this.user.uid}/operations`)
      const operationsQuery = previousCursor
        ? query(
          operationsRef,
          orderBy('created_At', 'desc'),
          orderBy(documentId(), 'desc'),
          startAfter(previousCursor.createdAt, previousCursor.docId),
          limit(this.totalOperPerPage)
        )
        : query(operationsRef, orderBy('created_At', 'desc'), orderBy(documentId(), 'desc'), limit(this.totalOperPerPage))

      const operationsSnap = await getDocs(operationsQuery)
      const operations = operationsSnap.docs.map((operationDoc) => this.mapOperationDoc(operationDoc))

      this.currentOpePage = safePage
      this.operationsSubject.next(operations)

      const pageLastDoc = operationsSnap.empty ? null : operationsSnap.docs[operationsSnap.docs.length - 1]
      const pageCursor = this.toOperationsPageCursor(pageLastDoc)
      this.cacheService.set<number, OperationPageCursor | null>(this.pageCursorCacheNamespace, this.currentOpePage, pageCursor)
    } catch (error) {
      console.error('Error retrieving Crawl Operations:', error)
      this.operationsSubject.next(null)
      this.totalPagesSubject.next(0)
      this.inTotalSubject.next(0)
    } finally {
      this.cdr.markForCheck()
    }
  }

  private async getOperationsPageStartCursor(targetPage: number): Promise<OperationPageCursor | null> {
    if (targetPage <= 1 || !this.user?.uid) {
      return null
    }

    const previousPage = targetPage - 1
    if (this.cacheService.has<number>(this.pageCursorCacheNamespace, previousPage)) {
      return this.cacheService.get<number, OperationPageCursor | null>(this.pageCursorCacheNamespace, previousPage) || null
    }

    const highestCachedPage = this.cacheService.getMaxNumericKey(this.pageCursorCacheNamespace)
    let startPage = highestCachedPage > 0 ? highestCachedPage + 1 : 1
    let cursor = highestCachedPage > 0
      ? this.cacheService.get<number, OperationPageCursor | null>(this.pageCursorCacheNamespace, highestCachedPage) || null
      : null
    const operationsRef = collection(this.db, `users/${this.user.uid}/operations`)

    for (let page = startPage; page <= previousPage; page += 1) {
      const pagedQuery = cursor
        ? query(
          operationsRef,
          orderBy('created_At', 'desc'),
          orderBy(documentId(), 'desc'),
          startAfter(cursor.createdAt, cursor.docId),
          limit(this.totalOperPerPage)
        )
        : query(operationsRef, orderBy('created_At', 'desc'), orderBy(documentId(), 'desc'), limit(this.totalOperPerPage))

      const pageSnap = await getDocs(pagedQuery)
      const pageLastDoc = pageSnap.empty ? null : pageSnap.docs[pageSnap.docs.length - 1]
      const pageCursor = this.toOperationsPageCursor(pageLastDoc)
      this.cacheService.set<number, OperationPageCursor | null>(this.pageCursorCacheNamespace, page, pageCursor)
      cursor = pageCursor

      if (pageSnap.empty) {
        break
      }
    }

    return this.cacheService.get<number, OperationPageCursor | null>(this.pageCursorCacheNamespace, previousPage) || null
  }

  private toOperationsPageCursor(docSnapshot: QueryDocumentSnapshot<DocumentData> | null): OperationPageCursor | null {
    if (!docSnapshot) {
      return null
    }

    return {
      createdAt: this.normalizeDateValue(docSnapshot.get('created_At')),
      docId: docSnapshot.id,
    }
  }

  private mapOperationDoc(operationDoc: QueryDocumentSnapshot<DocumentData>): CrawlOperation {
    const raw = operationDoc.data() as CrawlOperation & { created_At?: unknown }

    return {
      ...raw,
      id: operationDoc.id,
      created_At: this.normalizeDateValue(raw.created_At) as number,
      metrics: raw.metrics
        ? {
          ...raw.metrics,
          timestamp: this.normalizeMetricsTimestamp((raw.metrics as any).timestamp),
        }
        : raw.metrics,
    }
  }

  private normalizeDateValue(value: unknown): number {
    if (value instanceof Timestamp) {
      return value.toMillis()
    }

    if (value instanceof Date) {
      return value.getTime()
    }

    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? Date.now() : parsed
    }

    return Date.now()
  }

  private normalizeMetricsTimestamp(value: unknown): Date {
    if (value instanceof Timestamp) {
      return value.toDate()
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? new Date() : value
    }

    if (typeof value === 'number' || typeof value === 'string') {
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed
    }

    return new Date()
  }

  private resetOperationsPaginationCache(): void {
    this.cacheService.clear(this.pageCursorCacheNamespace)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.destroy$.next()
    this.destroy$.complete()
    this.crawlSubs?.unsubscribe()
    this.pagesSubs?.unsubscribe()
    this.timerSubs?.unsubscribe()
  }
}
