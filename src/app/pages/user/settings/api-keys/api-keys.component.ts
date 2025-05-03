import { NgFor, NgIf, DatePipe, AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, HostBinding, inject, Inject, OnInit } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import { NAVIGATOR } from 'src/app/core/providers';
import { CheckboxComponent, ClipboardbuttonComponent, SlideInModalComponent } from 'src/app/core/components';
import { MatIcon } from '@angular/material/icon';
import { ApiKey, ApiKeyLoader, ApiKeyType } from 'src/app/core/types';
import { ApiKeyService, LocalStorage } from 'src/app/core/services';
import { Outsideclick, RippleDirective, TooltipDirective } from 'src/app/core/directives';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { themeStorageKey } from 'src/app/shared';

@Component({
  selector: 'app-api-keys',
  imports: [NgFor, NgIf, DatePipe, AsyncPipe, ClipboardbuttonComponent, TooltipDirective,
    MatIcon, RippleDirective, Outsideclick, SlideInModalComponent, ReactiveFormsModule, MatProgressBarModule,
    CheckboxComponent],
  templateUrl: './api-keys.component.html',
  styleUrl: './api-keys.component.scss'
})
export class ApiKeysComponent implements OnInit {

  @HostBinding('class') classes = 'w-full'

  private apiKeySub: Subscription
  private localStorage: Storage = inject(LocalStorage)
  protected popupNewKeyVisible: boolean = false;
  protected apiKeys$: Observable<ApiKey[] | null>;

  protected newApiKey: FormControl<string>
  protected newApiKeyName: FormControl<string>
  protected defaultKey: FormControl<boolean>
  protected isKeyModalOpen: FormControl<boolean>
  protected keyModalTitle: string = ''
  protected apiKeyLoading: ApiKeyLoader

  constructor(
    private apiKeyService: ApiKeyService,
    @Inject(NAVIGATOR) private navigator: Navigator
  ) {

    this.apiKeyLoading = { modal: false, visibility: {} }

    this.apiKeys$ = this.apiKeyService.apiKeys$.pipe(
      tap((key: ApiKey[] | null) => {

        if (key && key.length) {

          key.map(key => this.apiKeyLoading.visibility[key.id] = false)
        }
      })
    );

    this.isKeyModalOpen = new FormControl<boolean>(false, { nonNullable: true })

    this.defaultKey = new FormControl<boolean>(true, { nonNullable: true, validators: [Validators.required] })
    this.newApiKey = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
    this.newApiKeyName = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  }

  ngOnInit(): void {
  }

  generateApiKey() {
    // open the popupmenu
    this.popupNewKeyVisible = true
  }

  deleteApiKey(key: ApiKey) {
    this.apiKeyService.deleteApiKey(key);
    setTimeout(() => {
      this.closePopupMenu(new Event(''), key);
    }, 100)
  }
  disableApiKey(key: ApiKey) {
    setTimeout(() => {
      this.closePopupMenu(new Event(''), key);
    }, 500)
    throw new Error('Method not implemented.');
  }

  copyToClipboard(key: ApiKey) {
    this.navigator.clipboard.writeText(key.key).then(() => {
      // Optional: Show a toast or snackbar to indicate successful copy
      console.log('API Key copied to clipboard');
      setTimeout(() => {
        this.closePopupMenu(new Event(''), key);
      }, 500)
    }).catch(err => {
      console.error('Failed to copy API key: ', err);
    });
  }
  toggleKeyVisibility(key: ApiKey) {
    const keyId = key.id as string
    this.apiKeyLoading.visibility[keyId] = true

    this.apiKeySub = this.apiKeyService.setKeyVisible(key)
      .subscribe({
        next: (currentKeys: ApiKey) => {
          console.log(currentKeys)
        },
        error: (err: any) => {
          console.error(err)
          this.apiKeyLoading.visibility[keyId] = false
        }, complete: () => {
          this.apiKeyLoading.visibility[keyId] = false
        }
      })
  }
  toggleMenuVisible(key: ApiKey) {
    this.apiKeyService.setMenuVisible(key);
  }

  addApiKey(type: string) {
    this.closePopupNewKey()
    this.keyModalTitle = type
    this.isKeyModalOpen.setValue(true)
  }

  clearKeysInput() {

    this.newApiKeyName.setValue('')
    this.newApiKey.setValue('')
  }

  closePopupMenu(event: Event, key: ApiKey) {

    /* const element = event.target as HTMLElement
    console.log(element) */

    if (!key.menu_visible) return

    this.apiKeyService.setMenuVisible(key);
  }

  closePopupNewKey() {
    this.popupNewKeyVisible = false;
  }

  keyModalCompleted() {

    if (!this.newApiKeyName.valid || !this.newApiKey.valid) return

    // set the loading state
    this.apiKeyLoading.modal = true

    // get the apiKey type from title
    const type = this.keyModalTitle.toLowerCase() as ApiKeyType

    // create a fake key to hide the real key
    const startFrom = 6
    const fakeKey = this.apiKeyService.generateFakeKey(this.newApiKey.value.length - startFrom, startFrom - 1)

    // generate the real key
    const newKey = this.apiKeyService.generateApiKey(this.newApiKeyName.value, this.newApiKey.value,
      this.newApiKey.value.substring(0, startFrom) + fakeKey, type, this.defaultKey.value)

    // subscribe
    this.apiKeySub = newKey
      .subscribe({
        next: (fun) => {

          console.log(fun)

        },
        error: (error) => {
          console.error('Error creating API key:', error);

          // set the loading state
          this.apiKeyLoading.modal = false

          // reset the input field in modal
          this.clearKeysInput()
        },
        complete: () => {
          this.apiKeyLoading.modal = false
          // reset the input field in modal
          this.clearKeysInput()

          // close the modal
          this.isKeyModalOpen?.setValue(!this.isKeyModalOpen?.value)
        }
      })

  }
  onCheckBoxChange() {
    console.log(this.defaultKey.value)
    // this.defaultKey.setValue(!this.defaultKey.value)
  }

  themeIsDark() {

    return this.localStorage?.getItem(themeStorageKey) === 'true'
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.apiKeySub?.unsubscribe()
  }


}
