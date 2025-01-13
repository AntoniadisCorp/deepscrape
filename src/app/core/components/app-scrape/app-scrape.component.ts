import { Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs/internal/Observable';
import { forkJoin } from 'rxjs/internal/observable/forkJoin';
import { of } from 'rxjs/internal/observable/of';
import { delay } from 'rxjs/internal/operators/delay';
import { mergeMap } from 'rxjs/internal/operators/mergeMap';
import { Subscription } from 'rxjs/internal/Subscription';
import { arrayBufferToString, calculateOpenAICost, chatInBatchesAI, constructCookiesforJina, extractDomain, formatBytes, sanitizeJSON } from 'src/app/core/functions';
import { aichunk, AIModel, Cookies, OpenAITokenDetails } from '../../types';
import { GinputComponent } from '../ginput/ginput.component';
import { AiAPIService, LocalStorage, SnackbarService } from '../../services';
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
import { tap } from 'rxjs/internal/operators/tap';

@Component({
  selector: 'app-scrape',
  standalone: true,
  imports: [MatIcon, MarkdownModule, NgIf, MatProgressSpinner,
    GinputComponent, PromptareaComponent, DropdownComponent, FormControlPipe,
    RadioToggleComponent,
    BrowserCookiesComponent
  ],
  templateUrl: './app-scrape.component.html',
  styleUrl: './app-scrape.component.scss'
})
export class AppScrapeComponent {
  readonly clipboardButton = ClipboardbuttonComponent;
  private localStorage: Storage
  @ViewChild(BrowserCookiesComponent) browserCookies: BrowserCookiesComponent;
  url: FormControl<string>

  userprompt: FormControl<string>

  submitButton: FormControl<boolean>

  jsonChunk: aichunk = { content: '', usage: null }

  isProcessing: boolean = false
  isComplete = false

  isGetRecipe = false
  errorMessage = ''

  forkJoinSubscription: Subscription
  aiResultsSub: Subscription


  model: AIModel[] = []

  modelAI: FormControl<AIModel>


  options: FormGroup

  constructor(
    private aiapi: AiAPIService,
    private snackbarService: SnackbarService,
    private fb: FormBuilder,

  ) {
    this.setAIModel()
    this.localStorage = inject(LocalStorage)
  }

  ngOnInit(): void {
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
        Validators.required,
        // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
      ]
    })

    this.options = this.fb.group({
      forwardCookies: new FormControl<boolean>(this.localStorage.getItem("forwardCookies") === "true", {
        // updateOn: 'change', //default will be change
        nonNullable: true,
        validators: [
          Validators.required,
          // Strong Password Validation
          // forbiddenNameValidator(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/i)
        ]
      }),
      // Enable iframe Extraction
      // Extracts and processes content from all embedded iframes within the DOM tree
      iframeEnable: new FormControl<boolean>(true, {
        // updateOn: 'change', //default will be change
        validators: [
          Validators.required,
          // Strong Password Validation
          // forbiddenNameValidator(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/i)
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

  private setAIModel() {
    const model = [
      { name: 'gpt-4-turbo', code: 'openai' },
      { name: 'gpt-4', code: 'openai' },
      { name: 'gpt-3.5', code: 'openai' },
      { name: 'gpt-4o-mini', code: 'openai' },
      { name: 'gpt-3.5-turbo', code: 'openai' },
      { name: 'llama-3.1-8b-instant', code: 'groq' },
      { name: 'llama-3.3-70b-versatile', code: 'groq' },
      { name: 'claude-3-5-sonnet-20240620', code: 'claude' },
      { name: 'claude-3-5-sonnet-20241022', code: 'claude' },
      { name: 'claude-3-haiku-20240307', code: 'claude' },
      { name: 'claude-3-5-haiku-20241022', code: 'claude' },
    ]
    this.model.push(...model)
  }

  protected onDropDownSelected($event: any) {
    // throw new Error('Method not implemented.');
  }

  protected onDataLinkChange(event: Event) {
    // const input = event.target as EventTarget & HTMLInputElement

    // go to the focus to the next text input, textarea
  }

  protected onPromptSubmited(prompt: string) {

    // return an error message
    if (!this.url.valid || !this.userprompt.valid)
      return

    this.closeResults()

    this.url.disable()
    this.userprompt.disable()
    this.submitButton.setValue(true)
    this.modelAI.disable()

    this.processData(this.url.value, this.modelAI.value.code)
  }


  processData(link: string, aitype: string = 'claude') {
    this.isProcessing = true;
    this.isComplete = false;
    this.errorMessage = ''

    const urls = [
      // 'https://www.masoutis.gr/categories/index/prosfores?item=0&subitem=2466&subdescr=web-only',
      // 'https://www.mymarket.gr/offers/1-plus-1?perPage=96'
      link
    ]


    const tasks = urls.map((url, index) => {
      return of(null).pipe(
        delay(index * 200), // Increasing delay for each request
        mergeMap(() => (this.forwardCookies?.value ? this.fetchCookiesFromExtension(url) : of(undefined))),
        mergeMap((cookies) =>
          this.aiapi.sendToJinaAI(url, { iframe: "true", forwardCookies: this.forwardCookies?.value },
            Array.isArray(cookies) ? constructCookiesforJina(cookies)
              : undefined
          ))
      )
    })


    this.forkJoinSubscription = forkJoin(tasks).subscribe({
      next: async (results) => {

        const subsequentContent = results.map((result: string) => {
          // const strlen = result.length
          const encoder = new TextEncoder();
          const bytesLength = encoder.encode(result).length;
          // const spitlen = strlen / 400 / 5
          console.log(formatBytes(bytesLength))
          return result // .slice(0, 2) splitArrayIntoChunks(result.split('[!'), 6)
        })

        // console.log(subsequentContent,)

        let subsequentPosts: Observable<{
          content: string;
          usage: any | null;
          role: any | null;
        }>[] = []

        const role: string = aitype === 'claude' ? 'user' : 'system'
        for await (const content of subsequentContent) {
          /* let article = 'Extract all articles information from website content return only data as markdown in typescript label if has code.'
          let co = `Extract all recipe information from website content
    recipe details like image video link steps tags or any usage data and return in JSON format of {
        "Recipe": {
          "title": "string",
          "rating": "number",
          "reviews": "number",
          "photos": "string[]",
          "video_link": "string | null",
          "description": "string",
          "submitted_by": "string",
          "updated_on": "string",
          "tested_by": "string",
          "prep_time": "string",
          "cook_time": "string",
          "additional_time": "string",
          "total_time": "string",
          "servings": "number",
          "ingredients": "string[]",
          "steps": "string[]",
          "tags": "string[]",
          "nutrition": {
           "calories": "number",
          "fat": "string",
          "carbs": "string",
          "protein": "string"},
          "usage_data": {
            "most_common_pairing": "string",
            "storage": "string"
          }
        }
      }.
    If a field is missing, use default value, return only the json data as markdown in typescript label.When use special characters must in content data use always Backslash` */
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
        this.isProcessing = false
        this.isComplete = true
        this.url.enable()
        this.userprompt.enable()
        this.submitButton.setValue(false)
        this.modelAI.enable()
      },
      error: (error: any) => {
        console.error('Error processing data:', error, arrayBufferToString(error.error));
        this.errorMessage = 'Error processing data. Please check console for details.';
        this.showSnackbar(this.errorMessage || "", SnackBarType.error, '', 5000)
        this.isProcessing = false;
        this.url.enable()
        this.userprompt.enable()
        this.submitButton.setValue(false)
        this.modelAI.enable()
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

  private sendBatchToOpenAI(messages: { role: string, content: string }[]): Observable<{ content: string, usage: any | null, role: any | null }> {

    return this.aiapi.sendToOpenAI(messages, this.modelAI.value.name)

  }

  private sendToClaudeAi(messages: { role: string, content: string }[]): Observable<{ content: string, role: string, usage: any | null }> {

    return this.aiapi.sendToClaudeAI(messages, this.modelAI.value.name, "you are a nice assistant")
  }


  private getResultsFromAI(subsequentPosts: Observable<{ content: string, usage: any | null, role: any | null }>[]) {

    // this.detailsMessage = 'Process AI Data'
    this.errorMessage = ''
    this.isProcessing = true
    this.isComplete = false
    this.isGetRecipe = true
    let usage = 0
    // Add any necessary headers for Claude AI API
    this.aiResultsSub = subsequentPosts[0]
      .subscribe(
        {
          next: (result: any) => {

            this.jsonChunk['content'] += result.content || ''
            if (result?.usage) {
              usage = calculateOpenAICost(result?.usage as OpenAITokenDetails, this.modelAI.value.name)
              this.jsonChunk['usage'] = usage
              console.log('usage', result?.usage)
            }
            // console.log('Claude AI response:', products.flat())
          },
          complete: () => {
            // console.log(JSON.parse(this.jsonChunk['content']), usage)
            this.isProcessing = false
            this.isComplete = true
            this.url.enable()
            this.userprompt.enable()
            this.submitButton.setValue(false)
            this.modelAI.enable()
          },
          error: (error) => {

            console.error('Error sending data to AI:', error)
            this.errorMessage = 'Error on get data from AI. Please check console for details.'
            this.showSnackbar(this.errorMessage || "", SnackBarType.error, '', 5000)
            this.isProcessing = false;
            this.url.enable()
            this.userprompt.enable()
            this.submitButton.setValue(false)
            this.modelAI.enable()
          }
        }
      )
  }

  protected closeResults() {

    this.isGetRecipe = !this.isGetRecipe
    this.jsonChunk['usage'] = null
    this.jsonChunk['content'] = ''
    this.aiResultsSub?.unsubscribe()
    this.forkJoinSubscription?.unsubscribe()
  }

  // Example function to handle cookies data
  private handleCookies(cookies: string) {
    // Validate and sanitize cookies data
    console.log('Cookies handled:', cookies);
  }

  onSnackbarAction() {
    this.snackbarService.hideSnackBar()
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

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.aiResultsSub?.unsubscribe()
    this.forkJoinSubscription?.unsubscribe()
  }
}

