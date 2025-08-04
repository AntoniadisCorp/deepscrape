import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppCrawlComponent } from './app-crawl.component';

describe('AppCrawlComponent', () => {
  let component: AppCrawlComponent;
  let fixture: ComponentFixture<AppCrawlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppCrawlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppCrawlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
