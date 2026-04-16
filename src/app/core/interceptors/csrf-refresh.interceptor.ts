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
import { WindowToken } from '../services';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

const CSRF_RETRIED = new HttpContextToken<boolean>(() => false);
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookieValue(cookieName: string, win: Window): string | null {
  const cookieSource = typeof win.document?.cookie === 'string' ? win.document.cookie : '';
  if (!cookieSource) {
    return null;
  }

  const prefix = `${cookieName}=`;
  const match = cookieSource
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(prefix.length));
}

function withCsrfHeader(req: HttpRequest<unknown>, win: Window, tokenOverride?: string | null): HttpRequest<unknown> {
  if (req.headers.has('csrf-token')) {
    return req;
  }

  const csrfToken = tokenOverride || readCookieValue('_csrf', win);
  if (!csrfToken) {
    return req;
  }

  return req.clone({
    setHeaders: {
      'csrf-token': csrfToken,
    },
  });
}

function hasCsrfHeader(req: HttpRequest<unknown>): boolean {
  return req.headers.has('csrf-token') || req.headers.has('x-csrf-token');
}

function fetchAndAttachCsrfToken(
  rawHttp: HttpClient,
  req: HttpRequest<unknown>,
  win: Window,
  contextOverride?: HttpContextToken<boolean>,
): Observable<HttpRequest<unknown>> {
  return rawHttp.get<{ csrfToken?: string }>('/csrf-token', { withCredentials: true }).pipe(
    switchMap((response) => {
      const freshToken = typeof response?.csrfToken === 'string' ? response.csrfToken : null;
      const tokenizedRequest = withCsrfHeader(req, win, freshToken);
      const requestWithContext = contextOverride
        ? tokenizedRequest.clone({ context: req.context.set(contextOverride, true) })
        : tokenizedRequest;

      return new Observable<HttpRequest<unknown>>((observer) => {
        observer.next(requestWithContext);
        observer.complete();
      });
    }),
  );
}

function isApiRequest(req: HttpRequest<unknown>, win: Window): boolean {
  try {
    const url = new URL(req.url, win.location.origin);
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
  const win = inject(WindowToken);

  const isMutatingApiRequest = isApiRequest(req, win) && MUTATING_METHODS.has(req.method.toUpperCase());
  const isRetried = req.context.get(CSRF_RETRIED);

  if (!isMutatingApiRequest) {
    return next(req);
  }

  const requestWithToken = withCsrfHeader(req, win);

  const executeRequest = (requestToSend: HttpRequest<unknown>): Observable<HttpEvent<unknown>> => next(requestToSend).pipe(
    catchError((error: unknown) => {
      if (!isCsrfFailure(error)) {
        return throwError(() => error);
      }

      if (isRetried) {
        return throwError(() => error);
      }

      return fetchAndAttachCsrfToken(rawHttp, req, win, CSRF_RETRIED).pipe(
        switchMap((retriedRequest) => next(retriedRequest)),
        catchError((refreshError: unknown) => throwError(() => refreshError)),
      );
    }),
  );

  if (hasCsrfHeader(requestWithToken) || isRetried) {
    return executeRequest(requestWithToken);
  }

  return fetchAndAttachCsrfToken(rawHttp, req, win).pipe(
    switchMap((requestWithFreshToken) => executeRequest(requestWithFreshToken)),
    catchError((refreshError: unknown) => throwError(() => refreshError)),
  );
};
