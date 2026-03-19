import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserComponent } from './browser.component';
import { getTestProviders } from 'src/app/testing';

describe('BrowserComponent', () => {
  let component: BrowserComponent;
  let fixture: ComponentFixture<BrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
