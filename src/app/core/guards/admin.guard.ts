import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AuthzService } from '../services';

export const adminGuard: CanActivateFn = () => {
    const router = inject(Router);
    const authzService = inject(AuthzService);
    return authzService.hasPlatformAdminAccess$().pipe(
        tap(isAdmin => {
            if (!isAdmin) router.navigate(['/']);
        })
    );
};

/** @deprecated Use the functional `adminGuard` instead. */
export class AdminGuard {
    canActivate = adminGuard;
}
