import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentComponent } from './payment.component';
import { getTestProviders } from 'src/app/testing';

describe('PaymentComponent', () => {
  let component: PaymentComponent;
  let fixture: ComponentFixture<PaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(PaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('amount getter returns the form value divided by 100', () => {
    expect(component.amount).toBe(25);
  });

  it('amount getter returns 0 when amount is negative', () => {
    component.checkoutForm.patchValue({ amount: -100 });
    expect(component.amount).toBe(0);
  });

  it('clear() resets name, email, address, zipcode and city to empty strings', () => {
    component.clear();
    const { name, email, address, zipcode, city } = component.checkoutForm.getRawValue();
    expect(name).toBe('');
    expect(email).toBe('');
    expect(address).toBe('');
    expect(zipcode).toBe('');
    expect(city).toBe('');
  });
});
