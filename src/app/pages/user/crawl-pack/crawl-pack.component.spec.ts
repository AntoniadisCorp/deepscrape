import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrawlPackComponent } from './crawl-pack.component';

describe('CrawlPackComponent', () => {
  let component: CrawlPackComponent;
  let fixture: ComponentFixture<CrawlPackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlPackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrawlPackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
