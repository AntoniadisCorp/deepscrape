import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlansComponent } from './plans.component';
import { BillingService } from 'src/app/core/services';
import { of } from 'rxjs';

describe('PlansComponent', () => {
  let component: PlansComponent;
  let fixture: ComponentFixture<PlansComponent>;

  beforeEach(async () => {
    const billingServiceMock: Partial<BillingService> = {
      getPlans$: () => of([]),
      billing$: of({
        plan: 'free',
        status: 'inactive',
        subscriptionId: null,
        graceUntil: null,
        credits: { balance: 0, reserved: 0, purchasedBalance: 0, purchasedReserved: 0, includedBalance: 0, includedReserved: 0 },
        features: {},
      }),
      getCreditPacks$: () => of([]),
      getCustomCreditsConfig$: () => of({
        enabled: true,
        minimumCredits: 50,
        maximumCredits: 5000,
        unitAmount: 19,
        currency: 'eur',
        suggestedCredits: [100, 250, 500],
      }),
      openCheckoutForPlan: async () => ({ url: '', sessionId: '' }),
    }

    await TestBed.configureTestingModule({
      imports: [PlansComponent],
      providers: [
        { provide: BillingService, useValue: billingServiceMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
