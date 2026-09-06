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
import { AuthService, WindowToken } from '../services'

function isBackendRequest(req: HttpRequest<unknown>, win: Window): boolean {
  try {
    const url = new URL(req.url, win.location.origin)
    return url.pathname.startsWith('/api') || url.pathname.startsWith('/oauth') || url.pathname.startsWith('/event')
  } catch {
    return req.url.startsWith('/api') || req.url.startsWith('/oauth') || req.url.startsWith('/event')
  }
}

function isSessionRevocationError(error: unknown): error is HttpErrorResponse {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return false
  }

  const code = typeof error.error === 'object' && error.error
    ? String((error.error as { code?: unknown; error?: unknown }).code || (error.error as { error?: unknown }).error || '')
    : ''

  const normalized = code.toLowerCase()
  return normalized === 'session_revoked' || normalized === 'auth/id-token-revoked' || normalized === 'id-token-revoked'
}

export const sessionRevocationInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router)
  const authService = inject(AuthService)
  const win = inject(WindowToken)

  if (!isBackendRequest(req, win)) {
    return next(req)
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isSessionRevocationError(error)) {
        return throwError(() => error)
      }

      authService.onSessionRevoked()

      const currentPath = router.url || '/dashboard'
      if (!currentPath.startsWith('/service/login')) {
        void router.navigate(['/service/login'], {
          queryParams: {
            reason: 'session_revoked',
            returnUrl: currentPath,
          },
        })
      }

      return throwError(() => error)
    }),
  )
}
