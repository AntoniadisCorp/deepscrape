import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services'
import { map, switchMap, take } from 'rxjs/operators'
import { Auth } from '@angular/fire/auth'
export const LoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.isAuthenticated()
  .pipe(
    map(( authData )=> {
      const { isAuthenticated, user } = authData

      if (isAuthenticated && user) {
        const isEmailVerified = user.emailVerified || false
        const isPhoneVerified = user.phoneVerified ?? null // Assuming phoneVerified is updated in AuthService.user

        console.log('LoginGuard - Authenticated:', isAuthenticated, 'User:', user)

        const isVerified = 
          ['google.com', 'github.com'].includes(user.currProviderData?.providerId || '') || 
          isEmailVerified || 
          isPhoneVerified

        if (isVerified) {
          const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
          router.navigateByUrl(returnUrl)
          return false
        } else {
          router.navigate(['/service/verification'], { queryParams: { returnUrl: state.url } })
          return false
        }
      }

      return true // Not authenticated, allow access to login page
    })
  )
}

export const verifyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const auth = inject(Auth)
  const router = inject(Router)

  return authService.isAuthenticated()
  .pipe(
    map(( authData )=> {
      const { isAuthenticated, user } = authData

      if (!isAuthenticated || !user) {
        router.navigate(['/service/login'])
        return false
      }

      const isVerified = user.emailVerified || auth.currentUser?.emailVerified || user.phoneVerified || false

      if (isVerified) {
        const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
        router.navigateByUrl(returnUrl)
        return false
      }

      return true // Allow access to verification page if not verified
    })
  )
}
