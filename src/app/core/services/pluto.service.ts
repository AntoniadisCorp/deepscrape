import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PaymentIntent } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';

export const PLUTO_ID = new InjectionToken<string>('[PLUTO] ClientID');

export const STRIPE_PUBLIC_KEY = environment.STRIPE_PUBLIC_KEY

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
