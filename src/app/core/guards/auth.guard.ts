import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs/internal/observable/of';
import { map } from 'rxjs/internal/operators/map';
import { take } from 'rxjs/internal/operators/take';


export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      // Allow access to authenticated users if they are already logged in
      if (user) {
        return true
      }
      // If a user is not authenticated return to the login page
      router.navigate(['/service/login']) // Adjust this route as needed
      return false
    })
  )
}
