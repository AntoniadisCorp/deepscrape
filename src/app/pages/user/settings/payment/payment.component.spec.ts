import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentTabComponent } from './payment.component';
import { getTestProviders } from 'src/app/testing';

describe('PaymentTabComponent', () => {
  let component: PaymentTabComponent;
  let fixture: ComponentFixture<PaymentTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentTabComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render Payment Methods heading', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Payment Methods');
  });

  it('should render Add Card submit button', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toBe('Add Card');
  });
});
