import { ChangeDetectorRef, Component, HostBinding, inject, signal, WritableSignal } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { GinputComponent } from '../ginput/ginput.component';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AsyncPipe, JsonPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { forkJoin } from 'rxjs/internal/observable/forkJoin';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { tap } from 'rxjs/internal/operators/tap';
import { AuthService, CrawlAPIService, FirestoreService, LocalStorage, SnackbarService } from '../../services';
import { Subject } from 'rxjs/internal/Subject';
import { concatMap } from 'rxjs/internal/operators/concatMap';
import { delay } from 'rxjs/internal/operators/delay';
import { CrawlPack, CrawlStatus, CrawlTask, DropDownOption } from '../../types'; // Removed CrawlResult from here
import { arrayBufferToString, setCrawlPackList } from '../../functions';
import { SnackBarType } from '../snackbar/snackbar.component';
import { MatIcon } from '@angular/material/icon';
import { RemoveToolbarDirective, RippleDirective } from '../../directives';
import { DropdownComponent } from '../dropdown/dropdown.component';
import { FormControlPipe } from '../../pipes';
import { RouterLink } from '@angular/router';
import { from } from 'rxjs/internal/observable/from';
import { startWith } from 'rxjs/internal/operators/startWith';
import { ClipboardbuttonComponent } from '../clipboardbutton/clipboardbutton.component';
import { expandCollapseAnimation } from 'src/app/animations';
import { MarkdownModule } from 'ngx-markdown';
import { BehaviorSubject, finalize, map, mergeMap, Observable, of, Subscription, takeLast, takeWhile } from 'rxjs';
import { RadioToggleComponent } from '../radiotoggle/radiotoggle.component';
import { CrawlResult } from '../../types/crawl-result.type'; // Import the CrawlResult interface
import { CrawlResultItemComponent } from '../crawl-result-item/crawl-result-item.component';
import { CrawlOperationStatus } from '../../enum';

const DEFAULT_CRAWL_PACK_SELECTION = { name: "select a crawlpack", code: "default" }
@Component({
  selector: 'app-crawl',
  imports: [MatProgressSpinner, GinputComponent, NgFor, NgIf, MatIcon, NgClass, RippleDirective,
    DropdownComponent, FormControlPipe, RouterLink, MarkdownModule, RemoveToolbarDirective, JsonPipe,
    RadioToggleComponent, CrawlResultItemComponent, AsyncPipe // Add the new component to imports
  ],
  animations: [expandCollapseAnimation],
  templateUrl: './app-crawl.component.html',
  styleUrl: './app-crawl.component.scss'
})
export class AppCrawlComponent {

  private localStorage = inject(LocalStorage)
  readonly clipboardButton = ClipboardbuttonComponent
  private destroy$ = new Subject<void>()

  // clear the timeout when the component is destroyed.
  private timeoutId: any;

  private tempTaskId: string
  private latestTaskId = signal<string | null>(null); // Initialize with null if no task ID initially


  @HostBinding('class') classes = 'flex items-center flex-col relative';

  crawlOptions: FormGroup

  crawlPackSelector: FormControl<DropDownOption | null>

  urls: FormControl<string>

  userprompt: FormControl<string>

  submitButton: FormControl<boolean>


  // Action Buttons
  enableClearBtn?: boolean = false
  protected itemVisibility: { [key: string]: WritableSignal<boolean> } = {};

  protected isResultsProcessing: boolean
  protected isCrawlProcessing: boolean
  protected isGetResults: boolean
  protected errorMessage = ''

  protected abortButtonPressed: boolean

  // Results Area
  crawlResults: any[] = []; // Array to hold results (keeping as any[] as per instruction)
  taskStatus$: Observable<string | undefined | null>

  

  // Data Lists
  crawlConfigPack: DropDownOption[] = []
  crawlpack: CrawlPack | undefined = undefined

  // Subscriptions
  loadPackSubscription: Subscription
  crawlSubscription: Subscription
  cancelSubscription: Subscription


  // Get Variables 
  protected get stream() {
    return this.crawlOptions.get('stream')
  }

  constructor(
    private authService: AuthService,
    private fireService: FirestoreService,
    private crawlService: CrawlAPIService,
    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,


  ) { }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.isResultsProcessing = false
    this.isCrawlProcessing = false
    this.isGetResults = false
    this.abortButtonPressed = false

    this.taskStatus$ = of(undefined)


    this.urls = new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
      ]
    },)

    this.userprompt = new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(4000) // Set the maximum length to 4000 characters
      ]
    })

    this.submitButton = new FormControl<boolean>(false, {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })

    this.crawlPackSelector = new FormControl<DropDownOption | null>(DEFAULT_CRAWL_PACK_SELECTION, {
      // updateOn: 'blur', //default will be change
      nonNullable: false,
      validators: [
        // Validators.required,
        // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
      ]
    })

    const initStream = this.localStorage.getItem("stream") === undefined ? true : this.localStorage.getItem("stream") === "true"

    this.crawlOptions = this.fb.group({
      stream: new FormControl<boolean>(initStream, {
        // updateOn: 'change', //default will be change
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }),
    })

    this.stream?.valueChanges.forEach((value: boolean) => {
      this.localStorage.setItem("stream", String(value))
      if (this.crawlpack && this.crawlpack.config
        && this.crawlpack.config.value
        && this.crawlpack.config.value.crawler_config) {
        this.crawlpack.config.value["crawler_config"].params.stream = value;
      }
      // this.browserCookies.closeModal = !value
    })

    // load most 10 recent crawl packs
    if (this.authService.user?.uid)
      this.loadPackSubscription = from(this.fireService.loadPreviousPacks(this.authService.user.uid))
        .pipe(startWith(undefined)) // Emit undefined initially to avoid flickering in the UI
        .subscribe({
          next: (pack: CrawlPack[] | null | undefined) => {
            if (!pack)
              return
            if (pack.length)
              setCrawlPackList(pack, this.crawlConfigPack)

            this.localStorage.setItem("crawlpack", JSON.stringify(pack))

          },
          error: (err: any) => {
            console.error(err)
          }
        })
  }

  submitCrawlJob() {
    console.log('Crawl Operation Started', this.urls.value)

    // return an error message if url or userpormpt is invalid
    if (!this.urls.valid || this.crawlPackSelector.value?.code === 'default')
      return

    // reset the results
    this.closeResults()

    // disable the form
    this.disableForm()

    // start the crawl operation
    this.isCrawlProcessing = true

    // enqueue crawl request to the python server api celery app
    this.crawlEnqueue(this.urls.value)
  }

  crawlEnqueue(formInput: string) {

    let urls = formInput.trim().split(',')

    // Create a new CrawlConfig object
    this.crawlSubscription = this.crawlService.getTempTaskId()
      .pipe(
        takeUntil(this.destroy$),
        tap((id: string) => this.tempTaskId = id),
        mergeMap((id: string) => {

          // ensure that ui prints the task status
          this.updateUIStatus(id)

          // add crawl task to the queue
          return this.crawlService.crawlEnqueue(urls, id, this.crawlpack as CrawlPack)
        }),
        // tap((task: CrawlTask) => console.log('a new crawl task' + ' added' + ' to the qeueu: ', task)),
        delay(3000), // Delay to ensure the request is sent
        concatMap((task: CrawlTask) => {
          /* Initialize the Results viariables  */
          this.errorMessage = ''
          this.isGetResults = true
          this.isResultsProcessing = true

          this.latestTaskId.set(task.id) // Emit the current task ID

          // process the data return streaming response
          return this.crawlService.getCrawlAIStream(task._links.self.href, task.id)
        })
      ).subscribe({
        next: (taskResult: any) => {

          // add data to the dom as they coming to the frontend
          this.addCrawlResult(taskResult)
        },
        complete: () => {
          // reset the processing status
          this.isResultsProcessing = this.isCrawlProcessing = false

          // reset the form
          this.enableForm()

          // detect changes
          // this.cdr?.detectChanges()
        },
        error: (error: any) => {

          // print the error
          console.error('Error processing data:', error, error.message);
          // set the error message to show on the screen by snackbar popup
          this.errorMessage = 'Error processing data. Please check console for details.';

          // reset the processing status
          this.isResultsProcessing = false
          // show snackbar Error
          this.showSnackbar(this.errorMessage || "", SnackBarType.error, '', 5000)
        }
      })
  }


  onDropDownSelected(event: DropDownOption) {

    const packId: string = event.code

    const storageItem: string | null = this.localStorage.getItem("crawlpack")

    if (!storageItem)
      return

    const recentPacks: CrawlPack[] = JSON.parse(storageItem)

    const pack = recentPacks.find((pack) => pack.id === packId)

    if (!pack)
      return

    this.itemVisibility[packId] = signal(false)
    this.itemVisibility['markdown'] = signal(this.itemVisibility[packId]())

    this.crawlpack = pack

    // This code snippet is checking if the `crawler_config` property exists in the `config` object of
    // `this.crawlpack`. If it exists, it retrieves the value of the `stream` property from
    // `crawler_config`.
    const isConfigStreamON = this.crawlpack.config.value["crawler_config"]?.params?.stream
    if (!isConfigStreamON)
      this.crawlpack.config.value["crawler_config"].params.stream = this.stream?.value
    else {
      this.stream?.setValue(isConfigStreamON)
    }

  }

  protected openJsonFormat(event: Event, packKey: any) {

    event.stopPropagation()

    if (!this.crawlpack)
      return

    // toggle visibility of packValue
    this.itemVisibility[packKey]?.update(prev => {
      if (prev) {
        return !prev
      }
      return true
    })

    this.timeoutId = setTimeout(() => {
      this.itemVisibility['markdown'].set(this.itemVisibility[packKey]())
    }, 300) // Adjust the timeout duration as needed

  }


  /**
   * Display Results Function
   */

  /**
   * The function `updateUIStatus` retrieves the status of a task from a service by SSE, displays
   * corresponding messages based on the status, and updates the UI accordingly.
   * @param {string} id - The `updateUIStatus` function takes an `id` parameter of type string. This
   * function is responsible for updating the UI status based on the task status retrieved from the
   * `crawlService`.
   */
  updateUIStatus(id: string) {

    this.taskStatus$ = this.crawlService.getTaskStatus(id).pipe(
      tap((status: string) => {
        console.log(`status: ${status}`)
        if (status === (CrawlOperationStatus.COMPLETED || CrawlOperationStatus.CANCELED || CrawlOperationStatus.FAILED)) {
          this.taskStatus$ = of(status)
          switch (status) {
            case CrawlOperationStatus.COMPLETED as string:
              this.showSnackbar("Task completed successfully!", SnackBarType.success)
              break
            case CrawlOperationStatus.CANCELED as string:
              this.showSnackbar("Task canceled successfully!", SnackBarType.info)
              break
            case CrawlOperationStatus.FAILED as string:
              this.showSnackbar("Task failed!", SnackBarType.error)
              break
            default:
              break
          }
        }
      }),
      takeWhile(status =>
        status !== ""
      )
    )
  }

  // Method to add new results (this would be called when a new streaming event arrives)
  addCrawlResult(line: any) {

    if (!line)
      return

    if (line?.dump && typeof line?.dump === 'string') {
      try {
        const dump: CrawlResult = JSON.parse(line.dump);
        console.log(dump);
        // Ensure the object conforms to CrawlResult structure and add necessary UI properties
        this.crawlResults.push({
          ...dump,
          message: line.message || "processing", // Use line.message if available, otherwise "processing"
          expanded: true // Initialize as expanded for the new item
        });
      } catch (e) {
        console.error('Failed to parse dump JSON:', e);
      }
    }
  }

  // Toggle visibility of a result item
  toggleResultVisibility(result: any) {
    result.expanded = !result.expanded;
  }

  // TrackBy function for *ngFor performance
  trackByCrawlResult(index: number, result: any): any {
    // Assuming each result has a unique identifier, e.g., a timestamp or a URL
    // If not, index can be used, but a unique ID is better for reordering/filtering
    return result.url || index;
  }

  /**
   * Important Functions
   */
  // 'info' | 'success' | 'warning' | 'error'
  showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }
  clearForm() {
    // reset url
    this.urls.setValue('')

    // reset crawlpack dropdown 
    this.crawlPackSelector.setValue(DEFAULT_CRAWL_PACK_SELECTION)

    // remove results
    this.crawlResults = []

    this.closeResults()
  }

  enableForm() {

    this.urls.enable()
    this.stream?.enable()
    this.submitButton.setValue(false)
  }

  private disableForm() {
    this.urls.disable()
    this.stream?.disable()

    this.submitButton.setValue(true)
  }

  protected closeResults() {

    // Close results, reset results variables and subscribers
    this.isGetResults = false
    this.tempTaskId = ''
    this.taskStatus$ = of(undefined)
    this.abortButtonPressed = false

    // this.jsonChunk['usage'] = null
    // this.jsonChunk['content'] = '']
    this.destroy$.next()
    this.latestTaskId.set(null)
    this.loadPackSubscription?.unsubscribe()
    this.crawlSubscription?.unsubscribe()
    this.cancelSubscription?.unsubscribe()
    // this.forkJoinSubscription?.unsubscribe()
  }

  abortRequests() {
    // const taskId = this.latestTaskId()
    const tempTaskId = this.tempTaskId

    console.log("cancel task by id ",tempTaskId)
    if(!tempTaskId || this.abortButtonPressed)
      return
    
    
    // Emit a signal to cancel the request
    this.destroy$.next()
    this.crawlSubscription?.unsubscribe()
    this.abortButtonPressed = true

    // send cancel job request
    this.cancelSubscription = this.crawlService.cancelTask(tempTaskId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: {status: string, message: string}) => {
        switch(res.status) {
          case SnackBarType.warning:
            this.showSnackbar(res.message, SnackBarType.warning)
            break
          case "ok":
            // new request to cancel and terminate the celery task
            this.showSnackbar(res.message, SnackBarType.info)
            break
        }
      },

      error: (error) => {
        console.log("an error occured on cancelation process: ", error)
      },
      complete: () => {
        
        this.isResultsProcessing = this.isCrawlProcessing = false
        this.enableForm()
        this.abortButtonPressed = false
        this.closeResults()
      }
    })
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    // Complete the Subject to prevent memory leaks
    this.destroy$.next()
    this.destroy$.complete()

    this.loadPackSubscription?.unsubscribe()
    this.crawlSubscription?.unsubscribe()
    this.cancelSubscription?.unsubscribe()
    

    if (this.timeoutId)
      clearTimeout(this.timeoutId)
  }

}
