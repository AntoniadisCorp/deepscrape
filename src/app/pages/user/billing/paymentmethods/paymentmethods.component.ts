import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Router } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { TranslateModule } from '@ngx-translate/core'
import {
  BehaviorSubject, catchError, combineLatest, from, map, Observable, of, shareReplay, switchMap,
} from 'rxjs'
import { collection, collectionData, Firestore, query } from '@angular/fire/firestore'
import { AuthService } from 'src/app/core/services'

interface SavedPaymentMethod {
  id: string
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
  billingDetails: string | null
}

@Component({
  selector: 'app-paymentmethods',
  imports: [AsyncPipe, MatIconModule, TranslateModule],
  templateUrl: './paymentmethods.component.html',
  styleUrl: './paymentmethods.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsComponent {
  private readonly authService = inject(AuthService)
  private readonly firestore = inject(Firestore)
  private readonly router = inject(Router)

  readonly refresh$ = new BehaviorSubject<void>(undefined)

  readonly paymentMethods$: Observable<SavedPaymentMethod[]> = combineLatest([
    this.authService.user$,
    this.refresh$,
  ]).pipe(
    switchMap(([user]) => {
      if (!user?.uid) {
        return of([])
      }

      const pmCollection = collection(this.firestore, `users/${user.uid}/payment_methods`)
      const pmQuery = query(pmCollection)
      return (collectionData(pmQuery, { idField: 'id' }) as Observable<SavedPaymentMethod[]>).pipe(
        catchError(() => of([])),
      )
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  getCardIcon(_brand: string | null): string {
    return 'credit_card'
  }

  getCardDisplay(pm: SavedPaymentMethod): string {
    const brand = pm.brand || 'card'
    const last4 = pm.last4 || '****'
    return `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${last4}`
  }

  getExpiryDisplay(pm: SavedPaymentMethod): string {
    if (!pm.expMonth || !pm.expYear) {
      return 'N/A'
    }

    return `${String(pm.expMonth).padStart(2, '0')}/${String(pm.expYear).slice(-2)}`
  }

  addPaymentMethod(): void {
    void this.router.navigate(['/billing/paymentintent'])
  }
}
