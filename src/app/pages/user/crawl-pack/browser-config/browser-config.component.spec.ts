import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserConfigComponent } from './browser-config.component';

describe('BrowserConfigComponent', () => {
  let component: BrowserConfigComponent;
  let fixture: ComponentFixture<BrowserConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowserConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
