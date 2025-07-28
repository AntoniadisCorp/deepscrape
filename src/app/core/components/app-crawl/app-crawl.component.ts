import { ChangeDetectorRef, Component, HostBinding, inject, signal, WritableSignal } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { GinputComponent } from '../ginput/ginput.component';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { JsonPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { of } from 'rxjs/internal/observable/of';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { mergeMap } from 'rxjs/internal/operators/mergeMap';
import { AuthService, CrawlAPIService, FirestoreService, LocalStorage, SnackbarService } from '../../services';
import { Subject } from 'rxjs/internal/Subject';
import { concatMap } from 'rxjs/internal/operators/concatMap';
import { delay } from 'rxjs/internal/operators/delay';
import { CrawlPack, CrawlTask, DropDownOption } from '../../types';
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
import { Subscription } from 'rxjs';
import { RadioToggleComponent } from '../radiotoggle/radiotoggle.component';

@Component({
  selector: 'app-crawl',
  imports: [MatProgressSpinner, GinputComponent, NgFor, NgIf, MatIcon, NgClass, RippleDirective,
    DropdownComponent, FormControlPipe, RouterLink, MarkdownModule, RemoveToolbarDirective, JsonPipe,
    RadioToggleComponent
  ],
  animations: [expandCollapseAnimation],
  templateUrl: './app-crawl.component.html',
  styleUrl: './app-crawl.component.scss'
})
export class AppCrawlComponent {

  private localStorage = inject(LocalStorage)
  readonly clipboardButton = ClipboardbuttonComponent
  private destroy$ = new Subject<void>();
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

  // Results Area
  crawlResults: any[] = []; // Array to hold results

  // Data Lists
  crawlConfigPack: DropDownOption[] = []
  crawlpack: CrawlPack | undefined = undefined

  // Subscriptions
  loadPackSubscription: Subscription
  crawlSubscription: Subscription


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


  ) {}


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.isResultsProcessing = false
    this.isCrawlProcessing = false
    this.isGetResults = false


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

    this.crawlPackSelector = new FormControl< DropDownOption | null>({name: "select a crawlpack", code: "default"}, {
      // updateOn: 'blur', //default will be change
      nonNullable: false,
      validators: [
        // Validators.required,
        // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
      ]
    })

    const initStream = this.localStorage.getItem("stream") === undefined? true : this.localStorage.getItem("stream") === "true"
    
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
              next: (pack: CrawlPack[]| null | undefined) => {
                if (!pack)
                  return
                if (pack.length)
                  setCrawlPackList(pack,this.crawlConfigPack)

                this.localStorage.setItem("crawlpack", JSON.stringify(pack))

              },
              error: (err: any) => {
                console.error(err)
              }
            })
  }

  submitCrawlJob(){
    console.log('Crawl Operation Started', this.urls.value)

    // return an error message if url or userpormpt is invalid
    if (!this.urls.valid)
      return

    // reset the results
    this.closeResults()

    // disable the form
    this.disableForm()

    // start the crawl operation
    this.isCrawlProcessing = true

    // send background request to the python server api
    this.crawlEnqueue(this.urls.value)

  }

  crawlEnqueue(formInput: string) {

    if (this.crawlPackSelector.value?.code === 'default')
      return
  
    let urls = formInput.trim().split(',')
    // Create a new CrawlConfig object
    this.crawlSubscription = of(urls)
    .pipe(
      takeUntil(this.destroy$),
      mergeMap((urls) => (
        this.crawlService.crawlEnqueue(urls, this.crawlpack as CrawlPack)
      )),
      delay(3000), // Delay to ensure the request is sent
      concatMap((task: CrawlTask) => {
        /* Initialize the Results viariables  */
        this.errorMessage = ''
        this.isGetResults = true
        this.isResultsProcessing = true

 
          // process the data
          return this.crawlService.getCrawlAIStream(task._links.self.href, task.id)
        })
      ).subscribe({
        next: (data: any) => {
          
          if (data)
            console.log(data)
            this.addCrawlResult(data)
        },
        complete: () => {
          // reset the processing status
          this.isResultsProcessing = this.isCrawlProcessing = false

          // reset the form
          this.enableForm()

          this.cdr?.detectChanges()
        },
        error: (error: any) => {

          // print the error
          console.error('Error processing data:', error, arrayBufferToString(error.error));
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

        // reset all boolean signal values in itemVisibility to false except packValue
        // Object.keys(this.itemVisibility).forEach(key => {
        //     if (key !== packKey) {
        //         this.itemVisibility[key]?.set(false)
        //     }
        // })
        // set itemToJson to packValue
        // this.itemToJson[packKey] = convertKeysToSnakeCase(switchPackKey(packKey, packValue?.config))
        // console.log(packKey, switchPackKey(packKey, snakeFormat))


    }


  /**
   * Display Results Function
   */

  // Method to add new results (this would be called when a new streaming event arrives)
  addCrawlResult(line: any) {
    let jsonLine = null
    jsonLine = { ... line}
   
    if (!jsonLine)
      return


    if (jsonLine?.dump && typeof jsonLine?.dump === 'string') {
      try {
        jsonLine.dump = JSON.parse(jsonLine.dump);
      } catch (e) {
        console.error('Failed to parse dump JSON:', e);
      }
      jsonLine.expanded = false; // Initialize as collapsed
      this.crawlResults.push(jsonLine);
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
  clearText() {
    this.urls.setValue('')
  }

  enableForm() {

    this.urls.enable()
    // this.userprompt.enable()
    this.submitButton.setValue(false)
    // this.modelAI.enable()
  }

  private disableForm() {
    this.urls.disable()
    this.userprompt.disable()
    this.submitButton.setValue(true)
    // this.modelAI.disable()
  }

  protected closeResults() {

    // Close results, reset results variables and subscribers
    this.isGetResults = false
    // this.jsonChunk['usage'] = null
    // this.jsonChunk['content'] = ''
    // this.aiResultsSub?.unsubscribe()
    // this.forkJoinSubscription?.unsubscribe()
  }

  abortRequests() {

    // Emit a signal to cancel the request
    this.destroy$.next()
    this.isResultsProcessing = this.isCrawlProcessing = false
    this.enableForm()
    this.showSnackbar('Request canceled', SnackBarType.info, '', 5000)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    // Complete the Subject to prevent memory leaks
    this.destroy$.next();
    this.destroy$.complete();
    this.loadPackSubscription?.unsubscribe()
    this.crawlSubscription?.unsubscribe()
  }

}
