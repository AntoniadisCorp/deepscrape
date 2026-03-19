import { TestBed } from '@angular/core/testing'
import { User } from '@angular/fire/auth'
import { firstValueFrom, of } from 'rxjs'
import { BillingService } from './billing.service'
import { FirestoreService } from './firestore.service'
import { getTestProviders } from 'src/app/testing';

describe('BillingService', () => {
  let service: BillingService
  let firestoreServiceMock: jasmine.SpyObj<Pick<FirestoreService, 'authState' | 'doc' | 'docData' | 'callFunction'>>

  const setAuthenticatedBilling = (billing: Record<string, unknown>) => {
    firestoreServiceMock.authState.and.returnValue(of({ uid: 'user_1' } as User))
    firestoreServiceMock.doc.and.returnValue({} as never)
    firestoreServiceMock.docData.and.returnValue(of(billing as never))
  }

  beforeEach(() => {
    firestoreServiceMock = jasmine.createSpyObj<Pick<FirestoreService, 'authState' | 'doc' | 'docData' | 'callFunction'>>(
      'FirestoreService',
      ['authState', 'doc', 'docData', 'callFunction'],
    )

    firestoreServiceMock.callFunction.and.callFake((
      ((name: string) => {
        if (name === 'getMyEntitlements') {
          return Promise.resolve({ billing: undefined })
        }

        if (name === 'getBillingCatalog') {
          return Promise.resolve({ plans: [], creditPacks: [], customCredits: {} })
        }

        return Promise.resolve({})
      }) as unknown as FirestoreService['callFunction']
    ))

    firestoreServiceMock.authState.and.returnValue(of(null))

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        BillingService,
        { provide: FirestoreService, useValue: firestoreServiceMock },
      ],
    })

    service = TestBed.inject(BillingService)
  })

  it('returns free access mode when user is not authenticated', async () => {
    const mode = await firstValueFrom(service.getAccessMode$())
    const canAccess = await firstValueFrom(service.canAccessPaidFeatures$())

    expect(mode).toBe('free')
    expect(canAccess).toBeFalse()
  })

  it('returns plan access mode for paid plans', async () => {
    setAuthenticatedBilling({
      plan: 'pro',
      features: {},
      credits: { balance: 0, reserved: 0 },
    })

    const mode = await firstValueFrom(service.getAccessMode$())

    expect(mode).toBe('plan')
  })

  it('returns credits access mode for free users with purchased credits', async () => {
    setAuthenticatedBilling({
      plan: 'free',
      subscriptionId: null,
      credits: {
        purchasedBalance: 15,
        purchasedReserved: 5,
      },
      features: {},
    })

    const mode = await firstValueFrom(service.getAccessMode$())
    const purchasedCredits = await firstValueFrom(service.getPurchasedCredits$())
    const canAccess = await firstValueFrom(service.canAccessPaidFeatures$())

    expect(mode).toBe('credits')
    expect(purchasedCredits).toBe(10)
    expect(canAccess).toBeTrue()
  })

  it('canPurchaseCredits$ is true only for free plan without subscription', async () => {
    setAuthenticatedBilling({
      plan: 'free',
      subscriptionId: null,
      credits: { purchasedBalance: 0, purchasedReserved: 0 },
      features: {},
    })

    const canPurchase = await firstValueFrom(service.canPurchaseCredits$())
    expect(canPurchase).toBeTrue()

    setAuthenticatedBilling({
      plan: 'free',
      subscriptionId: 'sub_123',
      credits: { purchasedBalance: 0, purchasedReserved: 0 },
      features: {},
    })

    const cannotPurchase = await firstValueFrom(service.canPurchaseCredits$())
    expect(cannotPurchase).toBeFalse()
  })

  it('hasFeature$ reflects feature flags from billing payload', async () => {
    setAuthenticatedBilling({
      plan: 'starter',
      credits: { includedBalance: 100, includedReserved: 0 },
      features: { api_access: true },
    })

    const enabled = await firstValueFrom(service.hasFeature$('api_access'))
    const disabled = await firstValueFrom(service.hasFeature$('missing_feature'))

    expect(enabled).toBeTrue()
    expect(disabled).toBeFalse()
  })
})
