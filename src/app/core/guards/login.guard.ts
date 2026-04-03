import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService, SnackbarService } from '../services'
import { map } from 'rxjs/operators'
import { SnackBarType } from '../components'

const VERIFICATION_REQUIRED_MESSAGE = 'Your email or phone number is not verified. Please verify to proceed.'

export const LoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)
  const snackbarService = inject(SnackbarService)

  return authService.isAuthenticated().pipe(
    map((authData) => {
      const { isAuthenticated, user } = authData

      if (!isAuthenticated || !user) {
        return true
      }

      const provider = user.currProviderData?.providerId || ''
      const isPasswordProvider = provider === 'password'
      const emailOk = !isPasswordProvider || user.emailVerified === true
      const phoneOk = user.phoneVerified !== false
      const isVerified = emailOk && phoneOk

      if (isVerified) {
        const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
        return router.parseUrl(returnUrl)
      }

      snackbarService.showSnackbar(VERIFICATION_REQUIRED_MESSAGE, SnackBarType.warning, '', 5000)
      return router.createUrlTree(['/service/verification'], { queryParams: { returnUrl: state.url } })
    })
  )
}

export const verifyGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.isAuthenticated().pipe(
    map((authData) => {
      const { isAuthenticated, user } = authData

      if (!isAuthenticated || !user) {
        return router.createUrlTree(['/service/login'])
      }

      const provider = user.currProviderData?.providerId || ''
      const isPasswordProvider = provider === 'password'
      const emailOk = !isPasswordProvider || user.emailVerified === true
      const phoneOk = user.phoneVerified !== false
      const isVerified = emailOk && phoneOk

      if (isVerified) {
        const returnUrl = route.queryParams['returnUrl'] || '/dashboard'
        return router.parseUrl(returnUrl)
      }

      return true
    })
  )
}
