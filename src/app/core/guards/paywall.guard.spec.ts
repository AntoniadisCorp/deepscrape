import { TestBed } from '@angular/core/testing'
import { CanActivateFn, Router } from '@angular/router'
import { firstValueFrom, isObservable, of } from 'rxjs'
import { BillingService } from '../services'
import { paywallGuard } from './paywall.guard'
import { getTestProviders } from 'src/app/testing';

describe('paywallGuard', () => {
  let billingServiceMock: jasmine.SpyObj<Pick<BillingService, 'canAccessPaidFeatures$'>>
  let routerMock: jasmine.SpyObj<Pick<Router, 'navigate'>>

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => paywallGuard(...guardParameters))

  const resolveGuardResult = async (result: ReturnType<CanActivateFn>): Promise<unknown> => {
    if (isObservable(result)) {
      return firstValueFrom(result)
    }

    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return result
    }

    return result
  }

  beforeEach(() => {
    billingServiceMock = jasmine.createSpyObj<Pick<BillingService, 'canAccessPaidFeatures$'>>('BillingService', ['canAccessPaidFeatures$'])
    routerMock = jasmine.createSpyObj<Pick<Router, 'navigate'>>('Router', ['navigate'])

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: BillingService, useValue: billingServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    })
  })

  it('allows navigation when user can access paid features', async () => {
    billingServiceMock.canAccessPaidFeatures$.and.returnValue(of(true))

    const result = await resolveGuardResult(executeGuard({} as never, { url: '/protected' } as never))

    expect(result).toBeTrue()
    expect(routerMock.navigate).not.toHaveBeenCalled()
  })

  it('redirects to billing plans when user cannot access paid features', async () => {
    billingServiceMock.canAccessPaidFeatures$.and.returnValue(of(false))
    routerMock.navigate.and.resolveTo(true)

    const result = await resolveGuardResult(executeGuard({} as never, { url: '/protected' } as never))

    expect(result).toBeFalsy()
    expect(routerMock.navigate).toHaveBeenCalledWith(['/billing/plans'], {
      queryParams: {
        reason: 'upgrade_required',
        returnUrl: '/protected',
      },
    })
  })
})
