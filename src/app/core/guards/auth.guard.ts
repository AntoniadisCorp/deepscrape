// auth.guard.ts
import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services'
import { map } from 'rxjs/operators'

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.isAuthenticated().pipe(
    map((authData) => {
      const { isAuthenticated, user } = authData

      if (!isAuthenticated || !user) {
        return router.createUrlTree(['/service/login'], { queryParams: { returnUrl: state.url } })
      }

      const isEmailVerified = user.emailVerified === true
      const phoneVerified = user.phoneVerified

      if (user.currProviderData?.providerId === 'password' && !isEmailVerified) {
        return router.createUrlTree(['/service/verification'], { queryParams: { returnUrl: state.url } })
      }

      if (phoneVerified === false) {
        return router.createUrlTree(['/service/verification'], { queryParams: { returnUrl: state.url } })
      }

      if (user.onboardedAt == null && !authService.isAdmin) {
        return router.createUrlTree(['/service/onboarding'])
      }

      return true
    })
  )
}
