// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, FirestoreService } from '../services';
import { map, take, switchMap } from 'rxjs/operators';
import { from, Observable, of } from 'rxjs';
import { Auth } from '@angular/fire/auth';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const auth = inject(Auth);

  return authService.isAuthStateResolved.pipe(
    take(1),
    map(() => {
      const user = authService.user;

      if (!user) {
        router.navigate(['/service/login'], { queryParams: { returnUrl: state.url } });
        return false
      }

      // console.log('User provider id:', user.providerData[0].providerId, 'Email verified:', user.emailVerified)
      const isPhoneVerified = user?.phoneVerified || false; // Default to false if not present
      
      if (user.providerData[0].providerId === 'password' && !user.emailVerified || ( user.phoneNumber && !isPhoneVerified)) {
        router.navigate(['/service/verification'], { queryParams: { returnUrl: state.url }})
        return false
          }

      return true
    })
  );
}
