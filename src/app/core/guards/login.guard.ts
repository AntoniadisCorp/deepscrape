import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

export const LoginGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    // take(1),
    map(user => {
      // If a user is already authenticated on the login page, redirect to home/dashboard
      if (user) {
        router.navigate(['/dashboard']); // Adjust this route as needed
        return false;
      }
      return true; // Allow access to login page if not authenticated
    })
  );
};
