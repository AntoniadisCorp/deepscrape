import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter } from 'rxjs/internal/operators/filter';
import { take } from 'rxjs/internal/operators/take';
import { map } from 'rxjs/internal/operators/map';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { AuthzService } from '../services';

type AuthzGuardData = {
  resource: 'ai' | 'crawl' | 'machine' | 'billing' | 'organization';
  action: 'execute' | 'read' | 'deploy' | 'update' | 'delete' | 'manage' | 'invite';
};

export const authzGuard: CanActivateFn = (route): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const authzService = inject(AuthzService);

  const authzData = route.data?.['authz'] as AuthzGuardData | undefined;
  if (!authzData?.resource || !authzData?.action) {
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      console.warn(`[authzGuard] No authz data on route "${route.routeConfig?.path ?? '?'}". Passing through — add route data.authz to enforce RBAC.`);
    }
    return of(true);
  }

  return authzService.membershipsReady$.pipe(
    filter(ready => ready),
    take(1),
    switchMap(() => authzService.can$(authzData.resource, authzData.action as never)),
    take(1),
    map(allowed => (allowed ? true : router.createUrlTree(['/']))),
  );
};
