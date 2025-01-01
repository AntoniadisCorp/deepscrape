import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core'
import { FirestoreService, PlutoService, STRIPE_PUBLIC_KEY } from '../../services'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Firestore } from '@angular/fire/firestore'
import { Functions, getFunctions, httpsCallable } from '@angular/fire/functions'
import { CurrencyPipe, JsonPipe, NgIf } from '@angular/common'
import { StripeElementsOptions, StripePaymentElementOptions } from '@stripe/stripe-js'
import { injectStripe, StripeElementsDirective, StripePaymentElementComponent } from 'ngx-stripe'


@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, CurrencyPipe, StripeElementsDirective, StripePaymentElementComponent, JsonPipe],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent {

  @ViewChild(StripePaymentElementComponent) paymentElement!: StripePaymentElementComponent

  private readonly fb = inject(FormBuilder)
  private readonly plutoService = inject(PlutoService)
  readonly stripe = injectStripe(STRIPE_PUBLIC_KEY)
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

  // DOM Element
  @ViewChild('cardForm') cardForm: ElementRef

  constructor(private firestoreService: FirestoreService, private firestore: Firestore, private functions: Functions) {
    this.firestore = this.firestoreService.getInstanceDB('easyscrape')
    this.functions = getFunctions(this.firestore.app)

    const id = 'acct_1OELbJFBBAUAyJFB' // acct_1Qazv0FVw33POJJ3
    const secret = '51OELbJFBBAUAyJFBC1X2QGDb8dWapELx1ElhfXV0VW6PbEGsgJBqxGjvcOjwvFqFGW2bZoWdyLc6dE2PEe79LFPw00TYL32CW2'

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
      },
      clientSecret: ''// `${id}_secret_${secret}`
    }
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    const amount = this.checkoutForm.get('amount')?.value



    this.plutoService
      .createPaymentIntent({
        amount,
        currency: 'eur',
      })
      .subscribe((pi) => {
        this.elementsOptions.clientSecret = pi.client_secret as string
      })
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

  collectPayment() {
    if (this.paying() || this.checkoutForm.invalid) return
    this.paying.set(true)

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
            /* this.dialog.open(NgxStripeDialogComponent, {
              data: {
                type: 'error',
                message: result.error.message,
              },
            }) */
          } else if (result.paymentIntent.status === 'succeeded') {
            /* this.dialog.open(NgxStripeDialogComponent, {
              data: {
                type: 'success',
                message: 'Payment processed successfully',
              },
            }) */
          }
        },
        error: (err) => {
          this.paying.set(false)
          /* this.dialog.open(NgxStripeDialogComponent, {
            data: {
              type: 'error',
              message: err.message || 'Unknown Error',
            },
          }) */
        },
      })
  }

  fetchUpdates() {
    this.paymentElement.fetchUpdates();
  }

  // Form submission Event Handler
  async handleForm(e: any) {
    e.preventDefault()
    // const { token, error } = await this.stripe.createToken(card)
    /* 
    if (error) {
      console.log('Something is wrong:', error)
    } else {
      const res = await httpsCallable(this.functions, 'startSubscription')({ source: token.id })
      console.log(res)
    } */
  }

}
