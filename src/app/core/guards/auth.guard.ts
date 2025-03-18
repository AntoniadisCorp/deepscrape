import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs/internal/observable/from';
import { of } from 'rxjs/internal/observable/of';
import { map } from 'rxjs/internal/operators/map';
import { take } from 'rxjs/internal/operators/take';
import { AuthService } from '../services';


export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated().pipe(
    take(1),
    map(user => {
      // Allow access to authenticated users if they are already logged in
      console.log(user)
      if (user) {
        return true
      } else {
        router.navigate(['/service/login']) // Adjust this route as needed
        return false
      }
      // If a user is not authenticated return to the login page
    })
  )
}
