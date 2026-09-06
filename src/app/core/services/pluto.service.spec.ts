import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PlutoService } from './pluto.service';
import { getTestProviders } from 'src/app/testing';
import { PLUTO_ID } from './pluto.service';

describe('PlutoService', () => {
  let service: PlutoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [...getTestProviders(), { provide: PLUTO_ID, useValue: 'merchant-123' }],
    });

    service = TestBed.inject(PlutoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create payment intent with merchant header', (done) => {
    const payload = { amount: 1200, currency: 'usd' };
    service.createPaymentIntent(payload).subscribe((response) => {
      expect(response).toEqual({ id: 'pi_1' } as any);
      done();
    });

    const req = httpMock.expectOne('https://api.pluto.ricardosanchez.dev/api/payments/create-payment-intent');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('merchant')).toBe('merchant-123');
    req.flush({ id: 'pi_1' });
  });
});
