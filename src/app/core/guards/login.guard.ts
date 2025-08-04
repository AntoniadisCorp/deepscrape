import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services';
import { map, take } from 'rxjs/operators';

export const LoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService); // Directly inject the service
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        // get return url from query parameters or default to home page
        const returnUrl = route.queryParams['returnUrl'] || '/'
        router.navigateByUrl(returnUrl)
        return false
      }

      return true
    })
  );
};