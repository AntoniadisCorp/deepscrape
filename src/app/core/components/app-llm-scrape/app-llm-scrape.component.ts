import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs/internal/Observable';
import { forkJoin } from 'rxjs/internal/observable/forkJoin';
import { of } from 'rxjs/internal/observable/of';
import { delay } from 'rxjs/internal/operators/delay';
import { mergeMap } from 'rxjs/internal/operators/mergeMap';
import { Subscription } from 'rxjs/internal/Subscription';
import {
  arrayBufferToString, calculateOpenAICost, chatInBatchesAI, constructCookiesforJina,
  crawlOperationStatusColor,
  extractDomain, formatBytes, sanitizeJSON,
  setAIModel
} from 'src/app/core/functions';
import { aichunk, AIModel, BrowserConfigurationImpl, CrawlConfig, CrawlerRunConfigImpl, CrawlOperation, CrawlPack, CrawlTask, OpenAITokenDetails } from '../../types';
import { GinputComponent } from '../ginput/ginput.component';
import { AiAPIService, CrawlAPIService, LocalStorage, SnackbarService } from '../../services';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { ClipboardbuttonComponent } from '../clipboardbutton/clipboardbutton.component';
import { PromptareaComponent } from '../promptarea/promptarea.component';
import { DropdownComponent } from '../dropdown/dropdown.component';
import { FormControlPipe } from "../../pipes";
import { BrowserCookiesComponent } from '../cookies/cookies.component';
import { SnackBarType } from '../snackbar/snackbar.component';
import { RadioToggleComponent } from '../radiotoggle/radiotoggle.component';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs/internal/Subject';
import { CrawlOperationStatus } from '../../enum';
import { concatMap } from 'rxjs/internal/operators/concatMap';
import { map } from 'rxjs/internal/operators/map';

@Component({
  selector: 'app-llm-scrape',
  imports: [MatIcon, MarkdownModule, NgIf, MatProgressSpinner,
    GinputComponent, PromptareaComponent, DropdownComponent, FormControlPipe,
    RadioToggleComponent,
    BrowserCookiesComponent
  ],
  templateUrl: './app-llm-scrape.component.html',
  styleUrl: './app-llm-scrape.component.scss'
})
export class AppLLMScrapeComponent {
  @HostBinding('class') classes = 'flex items-center flex-col relative';

  readonly clipboardButton = ClipboardbuttonComponent;
  private localStorage: Storage
  @ViewChild(BrowserCookiesComponent) browserCookies: BrowserCookiesComponent;
  url: FormControl<string>

  userprompt: FormControl<string>

  submitButton: FormControl<boolean>

  jsonChunk: aichunk = { content: '', usage: null }

  protected isResultsProcessing: boolean
  protected isCrawlProcessing: boolean
  protected isGetResults: boolean
  errorMessage = ''

  forkJoinSubscription: Subscription
  aiResultsSub: Subscription

  private destroy$ = new Subject<void>();


  model: AIModel[] = []

  modelAI: FormControl<AIModel>


  options: FormGroup

  constructor(
    private aiapi: AiAPIService,
    private crawlService: CrawlAPIService,
    private snackbarService: SnackbarService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef

  ) {
    setAIModel(this.model)
    this.localStorage = inject(LocalStorage)
  }

  ngOnInit(): void {
    this.isResultsProcessing = false
    this.isCrawlProcessing = false
    this.isGetResults = false
    this.errorMessage = ''

    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.url = new FormControl('', {
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

    this.modelAI = new FormControl<{ name: string, code: string }>({ name: 'claude-3-5-haiku-20241022', code: "claude" }, {
      // updateOn: 'blur', //default will be change
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })

    this.options = this.fb.group({
      forwardCookies: new FormControl<boolean>(this.localStorage.getItem("forwardCookies") === "true", {
        // updateOn: 'change', //default will be change
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }),
      // Enable iframe Extraction
      // Extracts and processes content from all embedded iframes within the DOM tree
      iframeEnable: new FormControl<boolean>(true, {
        // updateOn: 'change', //default will be change
        validators: [
          Validators.required,
        ]
      })
    })

    this.forwardCookies?.valueChanges.forEach((value: boolean) => {
      this.localStorage.setItem("forwardCookies", String(value))
      // this.browserCookies.closeModal = !value
    })
  }

  protected get forwardCookies() {
    return this.options.get('forwardCookies')
  }

  protected get iframeEnable() {
    return this.options.get('iframeEnable')
  }


  protected onDropDownSelected($event: any) {
    // throw new Error('Method not implemented.');
  }

  protected onDataLinkChange(event: Event) {
    // const input = event.target as EventTarget & HTMLInputElement
    // go to the focus to the next text input, textarea
  }

  protected onPromptSubmited(prompt: string) {

    console.log('Crawl Operation Started', this.url.value, this.userprompt.value, this.modelAI.value.code, prompt, this.modelAI.valid, this.url.valid, this.userprompt.valid)

    // return an error message if url or userpormpt is invalid
    if (!this.url.valid || !this.userprompt.valid || !this.modelAI.valid)
      return

    // reset the results
    this.closeResults()

    // disable the form
    this.disableForm()

    // save the Crawl operation
    // this.prepareCrawlOperation()

    // start the crawl operation
    this.isCrawlProcessing = true

    // live processing
    this.processData(this.url.value, this.modelAI.value.code)

    // send background request to the python server api
    // this.crawlEnqueue(this.url.value)
    
  }


  private processData(link: string, aitype: string = 'claude') {

    this.errorMessage = ''

    const urls = [
      // 'https://www.masoutis.gr/categories/index/prosfores?item=0&subitem=2466&subdescr=web-only',
      // 'https://www.mymarket.gr/offers/1-plus-1?perPage=96'
      link
    ]


    const tasks = urls.map((url, index) => {
      
      return of(null)
      
      .pipe(
        delay(index * 200), // Increasing delay for each request
        mergeMap(() => (this.forwardCookies?.value ? this.fetchCookiesFromExtension(url) : of(undefined))),
        mergeMap((cookies) =>
          this.crawlService.sendToCrawl4AI(url, { iframe: "true", forwardCookies: this.forwardCookies?.value },
            Array.isArray(cookies) ? constructCookiesforJina(cookies)
              : undefined
          ))
      )
    })

    // fork join the links
    this.forkJoinSubscription = forkJoin(tasks)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (results) => {
          const subsequentContent = results.map((result: string) => {
            // const strlen = result.length
            const encoder = new TextEncoder()
            const bytesLength = encoder.encode(result).length;
            // const spitlen = strlen / 400 / 5
            console.log(formatBytes(bytesLength))
            return result // .slice(0, 2) splitArrayIntoChunks(result.split('[!'), 6)
          })

          let subsequentPosts: Observable<{
            content: string;
            usage: any | null;
            role: any | null;
          }>[] = []

          const role: string = aitype === 'claude' ? 'user' : 'system'
          for await (const content of subsequentContent) {
            // subsequentPosts =  content.map((subcontent: string, index: number) => {
            let messages = []

            messages.push({ role, content: sanitizeJSON(this.userprompt.value.replace(/\n+/gi, '')) })

            chatInBatchesAI(messages, content)
            console.log(messages)

            subsequentPosts.push(of(null).pipe(
              // delay(1 * 4000), // Increasing delay for each request
              mergeMap(() => this.chooseAIModel(messages))
            ))
            // })

            // this.getResultsFromClaudeAI(subsequentPosts)
          }

          const arrayobs = subsequentPosts.shift() || null
          if (!arrayobs)
            return

          this.getResultsFromAI([arrayobs])
        },
        complete: () => {
          // reset the processing status
          // this.isResultsProcessing = this.isCrawlProcessing = false
          this.isCrawlProcessing = false
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

  private chooseAIModel(messages: any) {
    const modelAI = this.modelAI.value.code

    switch (modelAI) {
      case 'openai':
        return this.sendBatchToOpenAI(messages)
        break
      case 'groq':
        return this.sendBatchToOpenAI(messages)
        break
      case 'claude':
        return this.sendToClaudeAi(messages)
        break
      default:
        return this.sendToClaudeAi(messages)
        break
    }
  }

  private sendBatchToOpenAI(messages: { role: string, content: string }[]):
    Observable<{ content: string, usage: any | null, role: any | null }> {

    return this.aiapi.sendToOpenAI(messages, this.modelAI.value.name)

  }

  private sendToClaudeAi(messages: { role: string, content: string }[]):
    Observable<{ content: string, role: string, usage: any | null }> {

    return this.aiapi.sendToClaudeAI(messages, this.modelAI.value.name, "you are a nice assistant")
  }


  private getResultsFromAI(subsequentPosts: Observable<{ content: string, usage: any | null, role: any | null }>[]) {

    // this.detailsMessage = 'Process AI Data'
    /* Initialize the Results viariables  */
    this.errorMessage = ''
    this.isGetResults = true
    this.isResultsProcessing = true

    this.cdr?.detectChanges()
    // init the total cost and total tokens counter
    let total_cost = 0
    let total_tokens = 0

    // Add any necessary headers for Claude AI API
    this.aiResultsSub = subsequentPosts[0]
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (result: any) => {

            this.jsonChunk['content'] += result.content || ''


            if (result?.usage) {
              total_tokens = !(result?.usage as OpenAITokenDetails).total_tokens ?
                (result?.usage as OpenAITokenDetails).completion_tokens + (result?.usage as OpenAITokenDetails).prompt_tokens :
                (result?.usage as OpenAITokenDetails).total_tokens

              total_cost = calculateOpenAICost(result?.usage as OpenAITokenDetails, this.modelAI.value.name)

              // set jsonChunk usage
              this.jsonChunk['usage'] = { total_tokens, total_cost }
              // console.log('usage', result?.usage)
              // console.log(`content: `, this.jsonChunk['content'])
            }
          },
          complete: () => {

            // reset all variables to zero
            this.isResultsProcessing = false

            // reset the form
            this.enableForm()
          },
          error: (error) => {

            console.error('Error sending data to AI:', error)
            this.errorMessage = 'Error on get data from AI. Please check console for details.'

            // show show Snackbar
            this.showSnackbar(this.errorMessage || "", SnackBarType.error, '', 5000)

            // reset all variables to zero
            this.isResultsProcessing = false;

            // reset the form
            this.enableForm()
          }
        }
      )
  }

  enableForm() {

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

  protected closeResults() {

    // Close results, reset results variables and subscribers
    this.isGetResults = false
    this.jsonChunk['usage'] = null
    this.jsonChunk['content'] = ''
    this.aiResultsSub?.unsubscribe()
    this.forkJoinSubscription?.unsubscribe()
  }
  // 'info' | 'success' | 'warning' | 'error'
  showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }

  private fetchCookiesFromExtension(url: string) {
    return this.browserCookies.fetchCookiesFromExtension(url)
  }


  onClearText() {
    this.url.setValue('')
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
    this.aiResultsSub?.unsubscribe()
    this.forkJoinSubscription?.unsubscribe()
  }
}


