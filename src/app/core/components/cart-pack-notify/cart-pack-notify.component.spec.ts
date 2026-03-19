import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartPackNotifyComponent } from './cart-pack-notify.component';
import { getTestProviders } from 'src/app/testing';

describe('CartPackNotifyComponent', () => {
  let component: CartPackNotifyComponent;
  let fixture: ComponentFixture<CartPackNotifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPackNotifyComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(CartPackNotifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
