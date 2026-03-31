// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, FirestoreService } from '../services';
import { map, take, switchMap, delay } from 'rxjs/operators';
import { from, Observable, of } from 'rxjs';
import { Auth } from '@angular/fire/auth';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.isAuthenticated().pipe(
    map((authData) => {
      const { isAuthenticated, user } = authData

      if (!isAuthenticated || !user) {
        router.navigate(['/service/login'], { queryParams: { returnUrl: state.url } });
        return false
      }

      // ✅ Single source of truth: Use Firestore emailVerified (updated after email verification)
      const isEmailVerified = user?.emailVerified === true;
      // null  → phone never registered (optional, not required)
      // false → phone was registered at signup but not yet verified (required)
      // true  → phone verified ✓
      const phoneVerified = user?.phoneVerified;

      // Check if user needs email verification (password provider only)
      if (user?.currProviderData?.providerId === 'password' && !isEmailVerified) {
        router.navigate(['/service/verification'], { queryParams: { returnUrl: state.url } })
        return false
      }

      // Only block when phone was explicitly added at signup (phoneVerified === false)
      if (phoneVerified === false) {
        router.navigate(['/service/verification'], { queryParams: { returnUrl: state.url } })
        return false
      }

      // Redirect to onboarding if the user hasn't completed it yet
      // Bootstrap admins are auto-onboarded server-side; skip redirect if admin
      if (user.onboardedAt == null && !authService.isAdmin) {
        router.navigate(['/service/onboarding'])
        return false
      }

      return true
    })
  );
}
