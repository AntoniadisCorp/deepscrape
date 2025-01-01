import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppScrapeComponent } from './app-scrape.component';

describe('AppScrapeComponent', () => {
  let component: AppScrapeComponent;
  let fixture: ComponentFixture<AppScrapeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppScrapeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppScrapeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
