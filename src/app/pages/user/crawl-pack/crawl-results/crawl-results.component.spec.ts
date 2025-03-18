import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrawlResultsComponent } from './crawl-results.component';

describe('CrawlResultsComponent', () => {
  let component: CrawlResultsComponent;
  let fixture: ComponentFixture<CrawlResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrawlResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
