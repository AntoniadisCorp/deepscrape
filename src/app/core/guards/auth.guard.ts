// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services';
import { concatMap, map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const authService = inject(AuthService) // Directly inject the service
  const router = inject(Router)
  return authService.isAuthStateResolved.pipe(
    take(1),
    map((isAuthenticated) => {
      // Check if the user is authenticated
      if (isAuthenticated) return true

      // console.log('route state', state.url)
      router.navigate(['/service/login'], { queryParams: { returnUrl: state.url } })
      return false

    })
  )
}
