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
});
