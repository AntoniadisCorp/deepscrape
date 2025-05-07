import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserCookiesComponent } from './cookies.component';

describe('CookiesComponent', () => {
  let component: BrowserCookiesComponent;
  let fixture: ComponentFixture<BrowserCookiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserCookiesComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BrowserCookiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
