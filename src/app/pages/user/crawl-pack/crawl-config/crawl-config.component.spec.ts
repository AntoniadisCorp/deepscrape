import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrawlConfigComponent } from './crawl-config.component';
import { getTestProviders } from 'src/app/testing';

describe('CrawlConfigComponent', () => {
  let component: CrawlConfigComponent;
  let fixture: ComponentFixture<CrawlConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlConfigComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrawlConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
