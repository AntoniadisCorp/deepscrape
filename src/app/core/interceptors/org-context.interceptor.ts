import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthzService } from '../services';

function isApiRequest(req: HttpRequest<unknown>): boolean {
  if (req.url.startsWith('/api')) {
    return true;
  }

  try {
    const pathname = new URL(req.url).pathname;
    return pathname.startsWith('/api');
  } catch {
    return req.url.includes('/api/');
  }
}

export const orgContextInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!isApiRequest(req) || req.headers.has('x-org-id')) {
    return next(req);
  }

  const authz = inject(AuthzService);
  const orgId = authz.activeOrgId;

  if (!orgId) {
    return next(req);
  }

  const requestWithOrg = req.clone({
    setHeaders: {
      'x-org-id': orgId,
    },
  });

  return next(requestWithOrg);
};