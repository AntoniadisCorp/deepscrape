import {
  HttpBackend,
  HttpClient,
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

const CSRF_RETRIED = new HttpContextToken<boolean>(() => false);
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isApiRequest(req: HttpRequest<unknown>): boolean {
  try {
    const url = new URL(req.url, window.location.origin);
    return url.pathname.startsWith('/api');
  } catch {
    return req.url.startsWith('/api');
  }
}

function isCsrfFailure(error: unknown): error is HttpErrorResponse {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  if (error.status !== 403) {
    return false;
  }

  const bodyError = typeof error.error === 'object' && error.error ? String((error.error as { error?: unknown }).error || '') : '';
  const message = `${error.message || ''} ${bodyError}`.toLowerCase();

  return message.includes('csrf');
}

export const csrfRefreshInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const backend = inject(HttpBackend);
  const rawHttp = new HttpClient(backend);

  const shouldHandle =
    isApiRequest(req) &&
    MUTATING_METHODS.has(req.method.toUpperCase()) &&
    !req.context.get(CSRF_RETRIED);

  if (!shouldHandle) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isCsrfFailure(error)) {
        return throwError(() => error);
      }

      return rawHttp.get('/csrf-token', { withCredentials: true }).pipe(
        switchMap(() => {
          const retriedRequest = req.clone({
            context: req.context.set(CSRF_RETRIED, true),
          });
          return next(retriedRequest);
        }),
        catchError((refreshError: unknown) => throwError(() => refreshError)),
      );
    }),
  );
};
