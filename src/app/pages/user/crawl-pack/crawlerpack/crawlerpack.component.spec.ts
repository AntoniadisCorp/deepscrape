import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebCrawlerComponent } from './crawlerpack.component';

describe('WebCrawlerComponent', () => {
  let component: WebCrawlerComponent;
  let fixture: ComponentFixture<WebCrawlerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebCrawlerComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(WebCrawlerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
