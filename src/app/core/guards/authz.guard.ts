import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { map } from 'rxjs/internal/operators/map';
import { AuthzService } from '../services';

type AuthzGuardData = {
  resource: 'ai' | 'crawl' | 'machine' | 'billing' | 'organization';
  action: 'execute' | 'read' | 'deploy' | 'update' | 'delete' | 'manage' | 'invite';
};

export const authzGuard: CanActivateFn = (route): Observable<boolean> => {
  const router = inject(Router);
  const authzService = inject(AuthzService);

  const authzData = route.data?.['authz'] as AuthzGuardData | undefined;
  if (!authzData?.resource || !authzData?.action) {
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      console.warn(`[authzGuard] No authz data on route "${route.routeConfig?.path ?? '?'}". Passing through — add route data.authz to enforce RBAC.`);
    }
    return of(true);
  }

  return combineLatest([
    authzService.can$(authzData.resource, authzData.action as never),
    authzService.membershipsReady$,
  ])
    .pipe(
      filter(([, ready]) => ready),
      take(1),
      map(([allowed]) => {
        if (!allowed) {
          router.navigate(['/']);
          return false;
        }

        return true;
      }),
    );
};
