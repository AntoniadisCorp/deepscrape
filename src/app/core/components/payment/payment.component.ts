import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, signal, ViewChild } from '@angular/core'
import { FirestoreService, SessionStorage, SnackbarService, STRIPE_PUBLIC_KEY } from '../../services'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { CurrencyPipe } from '@angular/common';
import { StripeCardCvcElement, StripeCardElement, StripeElement, StripeElementsOptions, StripePaymentElement, StripePaymentElementOptions } from '@stripe/stripe-js'
import { injectStripe, StripeElementsDirective, StripePaymentElementComponent } from 'ngx-stripe'
import { from, Subscription } from 'rxjs'
import { SnackBarType } from '../snackbar/snackbar.component'

@Component({
    selector: 'app-payment',
    imports: [ReactiveFormsModule, CurrencyPipe, StripeElementsDirective, StripePaymentElementComponent],
    templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentComponent {

  @ViewChild(StripePaymentElementComponent) paymentElement!: StripePaymentElementComponent
  // DOM Element
  @ViewChild('cardForm') cardForm: ElementRef;
  private readonly fb = inject(FormBuilder)
  readonly stripe = injectStripe(STRIPE_PUBLIC_KEY)

  private sessionStorage: Storage = inject(SessionStorage)
  private cdr = inject(ChangeDetectorRef)

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
  private setupIntentSub: Subscription

  private cartId: string | null = null

  constructor(private firestoreService: FirestoreService,
    private snackbarService: SnackbarService
  ) {

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
    // get cartId from Session Storage
    this.cartId = this.sessionStorage.getItem("cart")// get cartId

    this.setupIntentSub = from(this.firestoreService.callFunction<{ cartId: string | null }, any>(
      'createSetupIntent',
      { cartId: this.cartId }
    ))
      .subscribe(
        {
          next: (data: any) => {
            console.log("fire function createSetupIntent success", data)
            const { error, clientSecret, cartId } = data as any

            if (error) {
              // create an error popup menu
              return
            }

            this.cartId = cartId
            console.log("cartId", cartId)
            // set to the cart the current cartId to the Storage
            this.sessionStorage.setItem("cart", this.cartId || "") // clear cart

            this.elementsOptions.clientSecret = clientSecret as string
            this.cdr.detectChanges()
          },
          error: (error) => {
            console.log("fire function createSetupIntent error", error)
          }
        }
      )
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
    event.preventDefault()
    if (this.paying() || this.checkoutForm.invalid) return
    this.paying.set(true)

    // this.card = this.paymentElement.elements.create('card')
    // this.card.mount(this.cardForm.nativeElement)

    const { name, email, address, zipcode, city } =
      this.checkoutForm.getRawValue()

    this.stripe
      .confirmSetup({
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
          } else if (result.setupIntent?.status === 'succeeded') {
            const paymentMethod = result.setupIntent.payment_method
            const paymentMethodId = typeof paymentMethod === 'string' ?
              paymentMethod :
              paymentMethod?.id

            if (paymentMethodId) {
              this.startSubscription(paymentMethodId)
            }

            this.showSnackbar('Payment method saved successfully', SnackBarType.success, '', 5000)
          }
        },
        error: (err) => {
          this.paying.set(false)
          this.showSnackbar(err.message || 'Unknown Error', SnackBarType.error, '', 5000)
        },
      })
  }

  handleForm(event: Event): void {
    this.collectPayment(event)
  }

  fetchUpdates() {
    this.paymentElement.fetchUpdates();
  }

  private startSubscription(paymentMethod: string): void {
    this.tokenSub = from(this.firestoreService.callFunction<{
      paymentMethod: string
      currency: string
      price: string
    }, any>('startSubscription', {
      paymentMethod,
      currency: 'eur',
      price: 'price_1Qb0bpFBBAUAyJFBL9NXsbp6',
    }))
      .subscribe({
        next: () => {
          this.showSnackbar('Subscription activated', SnackBarType.success, '', 4000)
        },
        error: (error) => {
          this.showSnackbar(error?.message || 'Unable to start subscription', SnackBarType.error, '', 5000)
        },
      })
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
    this.setupIntentSub?.unsubscribe()
    this.tokenSub?.unsubscribe()
  }
}
