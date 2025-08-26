import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentTabComponent } from './payment.component';

describe('PaymentTabComponent', () => {
  let component: PaymentTabComponent;
  let fixture: ComponentFixture<PaymentTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentTabComponent]
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
