import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentMethodsComponent } from './paymentmethods.component';
import { getTestProviders } from 'src/app/testing';

describe('PaymentmethodsComponent', () => {
  let component: PaymentMethodsComponent;
  let fixture: ComponentFixture<PaymentMethodsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentMethodsComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(PaymentMethodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render placeholder copy', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('paymentmethods works!');
  });

  it('should compile as standalone component', () => {
    expect((PaymentMethodsComponent as any).ɵcmp.standalone).toBeTrue();
  });
});
