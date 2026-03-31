import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

/**
 * Guards the /service/onboarding route.
 * - Redirects to /service/login if not authenticated.
 * - Redirects to /dashboard if the user has already completed onboarding, or is a bootstrap admin.
 * - Allows through if authenticated and onboardedAt is null/undefined.
 */
export const onboardingGuard: CanActivateFn = (): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    take(1),
    map(({ isAuthenticated, user }) => {
      if (!isAuthenticated || !user) {
        router.navigate(['/service/login']);
        return false;
      }
      // Bootstrap admins are auto-onboarded server-side; never show them the wizard
      if (authService.isAdmin || user.onboardedAt != null) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }),
  );
};
