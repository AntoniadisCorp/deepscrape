import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, FirestoreService } from '../services';
import { map, switchMap, take } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth';

export const LoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        
        // If authenticated, check verification status
        const user = authService.user;
        const isEmailVerified = user?.emailVerified || false;
        const isPhoneVerified = user?.phoneVerified || null; // Assuming phoneVerified is updated in AuthService.user

        console.log('LoginGuard - Authenticated:', isAuthenticated, 'User:', user)

        if ((user?.providerData[0]?.providerId === "google.com" || user?.providerData[0]?.providerId === "github.com" || isEmailVerified) || isPhoneVerified) {
          // If either email or phone is verified, redirect to dashboard
          const returnUrl = route.queryParams['returnUrl'] || '/dashboard';
          router.navigateByUrl(returnUrl);
          return false
        }
      }
      return true; // Not authenticated, allow access to login page
    })
  );
};

export const verifyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map((isAuthenticated) => {
      const user = authService.user;

      console.log('verifyGuard - Authenticated:', isAuthenticated, 'User:', user)

      if (!isAuthenticated || !user) {
        router.navigate(['/service/login']);
        return false;
      }

      const isEmailVerified = user.emailVerified;
      const isPhoneVerified = user.phoneVerified || null; // Assuming phoneVerified is updated in AuthService.user

      // If either email or phone is verified, redirect away from verification page
      if (isEmailVerified && (isPhoneVerified === null || isPhoneVerified)) {
        const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
        router.navigateByUrl(returnUrl)
        return false;
      }

      // If authenticated but neither is verified, allow access to verification page
      return true;
    })
  );
};
