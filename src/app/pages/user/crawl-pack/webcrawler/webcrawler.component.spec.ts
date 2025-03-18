import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebcrawlerComponent } from './webcrawler.component';

describe('WebcrawlerComponent', () => {
  let component: WebcrawlerComponent;
  let fixture: ComponentFixture<WebcrawlerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebcrawlerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WebcrawlerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
