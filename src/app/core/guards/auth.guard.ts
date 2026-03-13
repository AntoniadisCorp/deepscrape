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

      console.log('authGuard - Authenticated:', isAuthenticated, 'User:', user)

      // ✅ Single source of truth: Use Firestore emailVerified (updated after email verification)
      const isPhoneVerified = user?.phoneVerified || false;
      const isEmailVerified = user?.emailVerified || false;

      // Check if user needs email verification (password provider only)
      if (user?.currProviderData?.providerId === 'password' && !isEmailVerified) {
        router.navigate(['/service/verification'], { queryParams: { returnUrl: state.url } })
        return false
      }

      // Check if user needs phone verification
      if (user?.phoneNumber && !isPhoneVerified) {
        router.navigate(['/service/verification'], { queryParams: { returnUrl: state.url } })
        return false
      }

      return true
    })
  );
}
