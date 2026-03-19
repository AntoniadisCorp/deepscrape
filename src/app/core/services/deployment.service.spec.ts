import { TestBed } from '@angular/core/testing';

import { DeploymentService } from './deployment.service';
import { getTestProviders } from 'src/app/testing';

describe('DeploymentService', () => {
  let service: DeploymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(DeploymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
