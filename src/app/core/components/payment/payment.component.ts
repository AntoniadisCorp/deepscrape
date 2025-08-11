import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core'
import { FirestoreService, PlutoService, SessionStorage, SnackbarService, STRIPE_PUBLIC_KEY, WindowToken } from '../../services'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Firestore } from '@angular/fire/firestore'
import { connectFunctionsEmulator, Functions, getFunctions, httpsCallable } from '@angular/fire/functions'
import { CurrencyPipe, JsonPipe, NgIf } from '@angular/common'
import { StripeCardCvcElement, StripeCardElement, StripeElement, StripeElementsOptions, StripePaymentElement, StripePaymentElementOptions } from '@stripe/stripe-js'
import { injectStripe, StripeElementsDirective, StripePaymentElementComponent } from 'ngx-stripe'
import { from, fromEvent, Subscription } from 'rxjs'
import { Auth } from '@angular/fire/auth'
import { SnackBarType } from '../snackbar/snackbar.component'
import { environment } from 'src/environments/environment'

@Component({
    selector: 'app-payment',
    imports: [ReactiveFormsModule, NgIf, CurrencyPipe, StripeElementsDirective, StripePaymentElementComponent],
    templateUrl: './payment.component.html',
    styleUrl: './payment.component.scss'
})
export class PaymentComponent {

  @ViewChild(StripePaymentElementComponent) paymentElement!: StripePaymentElementComponent
  // DOM Element
  @ViewChild('cardForm') cardForm: ElementRef;
  private readonly fb = inject(FormBuilder)
  private readonly plutoService = inject(PlutoService)
  readonly stripe = injectStripe(STRIPE_PUBLIC_KEY)

  private window: Window = inject(WindowToken)


  private sessionStorage: Storage = inject(SessionStorage)

  checkoutForm: FormGroup

  elementsOptions: StripeElementsOptions

  paying = signal(false)

  paymentElementOptions: StripePaymentElementOptions = {
    layout: {
      type: 'tabs',
      defaultCollapsed: false,
      radios: false,
      spacedAccordionItems: false
    }
  };
  card: StripeCardElement

  private tokenSub: Subscription
  private paymentIntentSub: Subscription

  private cartId: string | null = null

  constructor(private firestoreService: FirestoreService,
    private firestore: Firestore,
    private functions: Functions,

    private auth: Auth,

    private snackbarService: SnackbarService
  ) {
    this.firestore = this.firestoreService.getInstanceDB('easyscrape')
    this.functions = getFunctions(this.firestore.app)

    if ( this.isLocalhost() || !environment.production) {

      console.log('🔥 Connecting to Firebase Emulators');
      connectFunctionsEmulator(this.functions, 'localhost', 8081);
    }

    this.checkoutForm = this.fb.group({
      name: ['Ricardo', [Validators.required]],
      email: ['support@ngx-stripe.dev', [Validators.required]],
      address: ['Av. Ramon Nieto 313B 2D', [Validators.required]],
      zipcode: ['36205', [Validators.required]],
      city: ['Vigo', [Validators.required]],
      amount: [2500, [Validators.required, Validators.pattern(/\d+/)]],
    })




    this.elementsOptions = {
      locale: 'en',
      appearance: {
        theme: 'stripe',
        labels: 'floating',
        variables: {
          colorPrimary: '#673ab7',
        },
      }
    }
    const amount = this.checkoutForm.get('amount')?.value

    // get cartId from Session Storage
    this.cartId = this.sessionStorage.getItem("cart")// get cartId

    this.paymentIntentSub = from(httpsCallable(this.functions, 'createPaymentIntent')
      ({ uid: this.auth.currentUser?.uid, amount, currency: "eur", cardId: this.cartId }))
      .subscribe(
        {
          next: (fun) => {
            console.log("fire function createPaymentIntent success", fun.data)
            const { error, clientSecret, cartId } = fun.data as any

            if (error) {
              // create an error popup menu
              return
            }

            this.cartId = cartId
            console.log("cartId", cartId)
            // set to the cart the current cartId to the Storage
            this.sessionStorage.setItem("cart", this.cartId || "") // clear cart

            this.elementsOptions.clientSecret = clientSecret as string
          },
          error: (error) => {
            console.log("fire function createPaymentIntent error", error)
          }
        }
      )
  }

  private isLocalhost(): boolean {
    return typeof this.window !== 'undefined' &&
           (this.window.location.hostname === 'localhost' ||
            this.window.location.hostname === '127.0.0.1');
  }

  ngOnInit() {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.



    /* this.plutoService
      .createPaymentIntent({
        amount,
        currency: 'eur',
      })
      .subscribe((pi) => {
        this.elementsOptions.clientSecret = pi.client_secret as string
      }) */
  }
  get amount() {
    const amountValue = this.checkoutForm.get('amount')?.value
    if (!amountValue || amountValue < 0) return 0

    return Number(amountValue) / 100
  }

  clear() {
    this.checkoutForm.patchValue({
      name: '',
      email: '',
      address: '',
      zipcode: '',
      city: '',
    })
  }

  collectPayment(event: Event) {
    if (this.paying() || this.checkoutForm.invalid) return
    this.paying.set(true)

    // this.card = this.paymentElement.elements.create('card')
    // this.card.mount(this.cardForm.nativeElement)

    const { name, email, address, zipcode, city } =
      this.checkoutForm.getRawValue()

    this.stripe
      .confirmPayment({
        elements: this.paymentElement.elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: name as string,
              email: email as string,
              address: {
                line1: address as string,
                postal_code: zipcode as string,
                city: city as string,
              },
            },
          },
        },
        redirect: 'if_required',
      })
      .subscribe({
        next: (result) => {
          this.paying.set(false)
          if (result.error) {

            this.showSnackbar(result.error.message || "Payment Error", SnackBarType.error, '', 5000)
          } else if (result.paymentIntent.status === 'succeeded') {
            // handle subscribption with firebase functions calls
            this.handleForm(event)

            this.showSnackbar('Payment processed successfully', SnackBarType.success, '', 5000)
          }
        },
        error: (err) => {
          this.paying.set(false)
          this.showSnackbar(err.message || 'Unknown Error', SnackBarType.error, '', 5000)
        },
      })
  }

  fetchUpdates() {
    this.paymentElement.fetchUpdates();
  }

  // Form submission Event Handler
  async handleForm(e: any) {
    e.preventDefault()
    const card = this.paymentElement.element
    if (!card)
      return
    // card?.mount(this.cardForm.nativeElement)

    // get the stripeId here
    this.tokenSub = this.stripe.createSource(card, {})
      .pipe()
      .subscribe((stripeSource) => {
        const { source, error } = stripeSource

        if (error) {
          this.showSnackbar(error.message || 'Unknown Error', SnackBarType.error, '', 5000)
        } else {
          const res = httpsCallable(this.functions, 'startSubscription')({ source: source.id, currency: "eur", price: "price_1Qb0bpFBBAUAyJFBL9NXsbp6" })
          console.log(res)
        }
      }
      )
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

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.paymentIntentSub?.unsubscribe()
    this.tokenSub?.unsubscribe()
  }
}
