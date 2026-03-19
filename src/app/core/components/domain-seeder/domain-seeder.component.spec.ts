import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DomainSeederComponent } from './domain-seeder.component';
import { CrawlAPIService, OperationStatusService, SeedingService, SnackbarService } from '../../services';
import { FormBuilder } from '@angular/forms';
import { getTestProviders } from 'src/app/testing';

describe('DomainSeederComponent', () => {
  let component: DomainSeederComponent;
  let fixture: ComponentFixture<DomainSeederComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainSeederComponent],
      providers: [
        ...getTestProviders(),
        { provide: FormBuilder, useValue: new FormBuilder() },
        { provide: SeedingService, useValue: jasmine.createSpyObj('SeedingService', ['seedDomain']) },
        { provide: CrawlAPIService, useValue: jasmine.createSpyObj('CrawlAPIService', ['crawl']) },
        { provide: SnackbarService, useValue: jasmine.createSpyObj('SnackbarService', ['open']) },
        { provide: OperationStatusService, useValue: jasmine.createSpyObj('OperationStatusService', ['setStatus', 'getStatus']) }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DomainSeederComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
