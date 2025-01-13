import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentmethodsComponent } from './paymentmethods.component';

describe('PaymentmethodsComponent', () => {
  let component: PaymentmethodsComponent;
  let fixture: ComponentFixture<PaymentmethodsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentmethodsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentmethodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
