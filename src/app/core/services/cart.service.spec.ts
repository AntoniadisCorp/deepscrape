import { TestBed } from '@angular/core/testing';

import { CartService } from './cart.service';
import { getTestProviders } from 'src/app/testing';

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(CartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose cart observable stream', () => {
    expect(service.getCart$).toBeDefined();
  });

  it('should emit null as the initial cart state', (done) => {
    service.getCart$.subscribe((value) => {
      expect(value).toBeNull();
      done();
    });
  });
});
