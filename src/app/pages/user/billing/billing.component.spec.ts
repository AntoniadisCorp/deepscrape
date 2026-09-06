import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillingComponent } from './billing.component';
import { getTestProviders } from 'src/app/testing';

describe('BillingComponent', () => {
  let component: BillingComponent;
  let fixture: ComponentFixture<BillingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(BillingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply grow class via host binding', () => {
    const host: HTMLElement = fixture.nativeElement;

    expect(host.classList.contains('grow')).toBeTrue();
  });

  it('getRouteAnimationData should return outlet animation key when available', () => {
    const fakeOutlet = {
      activatedRouteData: { animation: 'billing-transactions' },
    } as any;

    expect(component.getRouteAnimationData(fakeOutlet)).toBe('billing-transactions');
  });

  it('getRouteAnimationData should return fallback key when outlet is missing', () => {
    expect(component.getRouteAnimationData(null)).toBe('billing-initial');
    expect(component.getRouteAnimationData(undefined)).toBe('billing-initial');
  });
});
