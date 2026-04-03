import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { resolveSafeReturnUrl } from '../functions';
import { AuthService } from '../services';
import { map, take } from 'rxjs/operators';

/**
 * Guards the /service/onboarding route.
 * - Redirects to /service/login if not authenticated.
 * - Redirects to /dashboard if the user has already completed onboarding, or is a bootstrap admin.
 * - Allows through if authenticated and onboardedAt is null/undefined.
 */
export const onboardingGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    take(1),
    map(({ isAuthenticated, user }) => {
      const safeReturnUrl = resolveSafeReturnUrl(route.queryParams['returnUrl'] || state.url)

      if (!isAuthenticated || !user) {
        return router.createUrlTree(['/service/login'], { queryParams: { returnUrl: safeReturnUrl } });
      }
      // Bootstrap admins are auto-onboarded server-side; never show them the wizard
      if (authService.isAdmin || user.onboardedAt != null) {
        return router.parseUrl(safeReturnUrl);
      }
      return true;
    }),
  );
};
