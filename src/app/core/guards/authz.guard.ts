import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
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

  return authzService
    .can$(authzData.resource, authzData.action as never)
    .pipe(
      map((allowed) => {
        if (!allowed) {
          router.navigate(['/']);
          return false;
        }

        return true;
      }),
    );
};
