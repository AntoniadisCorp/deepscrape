import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services'
import { map, switchMap, take } from 'rxjs/operators'
export const LoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.isAuthenticated().pipe(
    switchMap(isAuthenticated => authService.user$.pipe(take(1), map(user => ({ isAuthenticated, user })))),
    map(( authData )=> {
      const { isAuthenticated, user } = authData

      if (isAuthenticated) {
        
        // If authenticated, check verification status
        
        const isEmailVerified = user?.emailVerified || false
        const isPhoneVerified = user?.phoneVerified || null // Assuming phoneVerified is updated in AuthService.user

        console.log('LoginGuard - Authenticated:', isAuthenticated, 'User:', user)

        if ((user?.currProviderData?.providerId === "google.com" || user?.currProviderData?.providerId === "github.com" || isEmailVerified) || isPhoneVerified) {
          // If either email or phone is verified, redirect to dashboard
          const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
          router.navigateByUrl(returnUrl)
          return false
        }
      }
      return true // Not authenticated, allow access to login page
    })
  )
}

export const verifyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.isAuthenticated()
  .pipe(
    switchMap(isAuthenticated => authService.user$.pipe(take(1), map(user => ({ isAuthenticated, user })))),
    map(( authData )=> {
      const { isAuthenticated, user } = authData

      console.log('verifyGuard - Authenticated:', isAuthenticated, 'User:', user)

      if (!isAuthenticated || !user) {
        router.navigate(['/service/login'])
        return false
      }

      const isEmailVerified = user.emailVerified
      const isPhoneVerified = user.phoneVerified || null // Assuming phoneVerified is updated in AuthService.user

      // If either email or phone is verified, redirect away from verification page
      if (isEmailVerified && (isPhoneVerified === null || isPhoneVerified)) {
        const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
        router.navigateByUrl(returnUrl)
        return false
      }

      // If authenticated but neither is verified, allow access to verification page
      return true
    })
  )
}
