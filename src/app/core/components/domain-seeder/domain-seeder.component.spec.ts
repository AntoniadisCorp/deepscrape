import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { DomainSeederComponent } from './domain-seeder.component';
import { AuthService, CrawlAPIService, OperationStatusService, SeedingService, SnackbarService } from '../../services';
import { getTestProviders } from 'src/app/testing';

describe('DomainSeederComponent', () => {
  let component: DomainSeederComponent;

  const seedingServiceStub = {
    multiSeedEnqueue: () => of(),
    cancelTask: () => of(),
  } as unknown as SeedingService;

  const crawlServiceStub = {} as CrawlAPIService;
  const snackbarServiceStub = { showSnackbar: jasmine.createSpy('showSnackbar') } as unknown as SnackbarService;
  const operationStatusStub = {} as OperationStatusService;
  const authServiceStub = { user$: of(null) } as unknown as AuthService;
  const routerStub = { navigate: jasmine.createSpy('navigate') } as unknown as Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        FormBuilder,
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new DomainSeederComponent(
        TestBed.inject(FormBuilder),
        seedingServiceStub,
        crawlServiceStub,
        snackbarServiceStub,
        operationStatusStub,
        authServiceStub,
        routerStub
      )
    );

    component.ngOnInit();
  });

  it('should initialise researchForm with default config values', () => {
    const cfg = component.researchForm.get('config');
    expect(cfg).toBeTruthy();
    expect(cfg?.get('source')?.value).toBe('sitemap+cc');
    expect(cfg?.get('concurrency')?.value).toBe(1000);
  });

  it('should start with an empty domains FormArray', () => {
    expect(component.domains.length).toBe(0);
  });

  it('should add and remove domains through form helpers', () => {
    component.addDomain();
    component.addDomain();

    expect(component.domains.length).toBe(2);

    component.removeDomain(0);
    expect(component.domains.length).toBe(1);
  });

  it('should validate domain format correctly', () => {
    expect(component.isDomainValid('example.com')).toBeTrue();
    expect(component.isDomainValid('invalid_domain')).toBeFalse();
  });

  it('should mark domains as valid only when at least one domain exists', () => {
    expect(component.validateDomains()).toBeFalse();
    component.addDomain();
    expect(component.validateDomains()).toBeTrue();
  });
});
