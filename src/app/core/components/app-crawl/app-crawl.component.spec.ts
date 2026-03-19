import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppCrawlComponent } from './app-crawl.component';
import { getTestProviders } from 'src/app/testing';

describe('AppCrawlComponent', () => {
  let component: AppCrawlComponent;
  let fixture: ComponentFixture<AppCrawlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppCrawlComponent],
      providers: getTestProviders(),
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
