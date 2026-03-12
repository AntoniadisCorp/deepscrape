import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { WindowToken } from '../services'

function isApiRequest(req: HttpRequest<unknown>, win: Window): boolean {
  try {
    const url = new URL(req.url, win.location.origin)
    return url.pathname.startsWith('/api')
  } catch {
    return req.url.startsWith('/api')
  }
}

function isPaymentRequired(error: unknown): error is HttpErrorResponse {
  if (!(error instanceof HttpErrorResponse)) {
    return false
  }

  if (error.status === 402) {
    return true
  }

  const bodyError = typeof error.error === 'object' && error.error
    ? String((error.error as { error?: unknown; code?: unknown }).error || (error.error as { code?: unknown }).code || '')
    : ''

  return bodyError.toLowerCase().includes('payment_required')
}

export const paymentRequiredInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router)
  const win = inject(WindowToken)

  if (!isApiRequest(req, win)) {
    return next(req)
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isPaymentRequired(error)) {
        return throwError(() => error)
      }

      const currentPath = router.url || '/'
      if (!currentPath.startsWith('/billing')) {
        void router.navigate(['/billing/plans'], {
          queryParams: {
            reason: 'payment_required',
            returnUrl: currentPath,
          },
        })
      }

      return throwError(() => error)
    }),
  )
}
