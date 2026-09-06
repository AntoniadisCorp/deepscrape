import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrawlResultsComponent } from './crawl-results.component';
import { getTestProviders } from 'src/app/testing';

describe('CrawlResultsComponent', () => {
  let component: CrawlResultsComponent;
  let fixture: ComponentFixture<CrawlResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlResultsComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrawlResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize results form with default booleans', () => {
    expect(component.resultsForm).toBeTruthy();
    expect(component.resultsForm.get('html')?.value).toBeFalse();
    expect(component.resultsForm.get('pdf')?.value).toBeFalse();
  });

  it('addNewCrawlResults should open settings and reset selection', () => {
    (component as any).configSelectedById = 'result-1';
    component.resultsForm.get('title')?.setValue('Result Config A');

    (component as any).addNewCrawlResults();

    expect((component as any).newConfigOpened).toBeTrue();
    expect((component as any).showSettings).toBeTrue();
    expect((component as any).configSelectedById).toBe('');
    expect(component.resultsForm.get('title')?.value).toBe('');
  });

  it('getAndFilterConfirmForm should omit title and created_at', () => {
    component.resultsForm.get('title')?.setValue('Result Config');
    component.resultsForm.get('html')?.setValue(true);
    component.resultsForm.get('html')?.markAsDirty();

    const result = component.getAndFilterConfirmForm() as any;

    expect(result.title).toBeUndefined();
    expect(result.created_at).toBeUndefined();
    expect(result.html).toBeTrue();
  });
});
