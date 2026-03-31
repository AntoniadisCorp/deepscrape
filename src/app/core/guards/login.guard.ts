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
        // ✅ Single source of truth: Firestore
        const isEmailVerified = user.emailVerified || false
        const provider = user.currProviderData?.providerId || ''

        console.log('LoginGuard - Authenticated:', isAuthenticated, 'User:', user)

          // Social providers are always considered verified
          // null  = no phone registered → treat as verified (optional phone)
          // false = phone registered at signup but unverified → redirect to verification
        const isVerified = 
          ['google.com', 'github.com'].includes(provider) || 
          isEmailVerified || 
            user.phoneVerified === true

        if (isVerified) {
          // Already verified, go to dashboard
          const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
          router.navigateByUrl(returnUrl)
          return false
        } else {
          // Not verified, go to verification page
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

      // ✅ Single source of truth: Firestore
        const provider = user.currProviderData?.providerId || '';
        // Social providers → always verified
        // phoneVerified === null → no phone registered, not blocking
        // phoneVerified === false → phone added at signup, must verify
        const isVerified =
          ['google.com', 'github.com'].includes(provider) ||
          user.emailVerified === true ||
          user.phoneVerified === true;

      if (isVerified) {
        const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
        router.navigateByUrl(returnUrl)
        return false
      }

      return true // Allow access to verification page if not verified
    })
  )
}
