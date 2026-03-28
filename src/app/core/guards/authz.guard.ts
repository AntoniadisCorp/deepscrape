import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable } from 'rxjs/internal/Observable';
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
    return authzService.hasPlatformAdminAccess$().pipe(
      map(() => true),
    );
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
