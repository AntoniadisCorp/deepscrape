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
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};