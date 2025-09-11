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
    map(( authData )=> {
      const { isAuthenticated, user } = authData

      if (!isAuthenticated || !user) {
        router.navigate(['/service/login'], { queryParams: { returnUrl: state.url } });
        return false
      }

      console.log('authGuard - Authenticated:', isAuthenticated, 'User:', user)

      // console.log('User provider id:', user.providerData[0].providerId, 'Email verified:', user.emailVerified)
      const isPhoneVerified = user?.phoneVerified || false; // Default to false if not present

      if (user?.currProviderData?.providerId === 'password' && !user.emailVerified || (user?.phoneNumber && !isPhoneVerified)) {
        router.navigate(['/service/verification'], { queryParams: { returnUrl: state.url } })
        return false
      }

      return true
    })
  );
}
