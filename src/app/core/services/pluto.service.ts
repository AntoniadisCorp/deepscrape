import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PaymentIntent } from '@stripe/stripe-js';

export const PLUTO_ID = new InjectionToken<string>('[PLUTO] ClientID');

export const STRIPE_PUBLIC_KEY =
  'pk_test_51Ii5RpH2XTJohkGafOSn3aoFFDjfCE4G9jmW48Byd8OS0u2707YHusT5PojHOwWAys9HbvNylw7qDk0KkMZomdG600TJYNYj20';
// pk_test_51OELbJFBBAUAyJFBp3qyNV35TE56uUP9g1IkZ0KOuWnrNLC2ijFoIIkG71xqISwnFwiibjCOumO8itPsLLIyA1py00ABQ2TJ4H

@Injectable({ providedIn: 'root' })
export class PlutoService {
  private static readonly BASE_URL = 'https://api.pluto.ricardosanchez.dev/api';

  constructor(
    @Inject(PLUTO_ID) private readonly clientId: string,
    private readonly http: HttpClient
  ) { }

  createPaymentIntent(params: any): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(
      `${PlutoService.BASE_URL}/payments/create-payment-intent`,
      params,
      { headers: { merchant: this.clientId } }
    );
  }
}
