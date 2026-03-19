import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserConfigComponent } from './browser-config.component';
import { getTestProviders } from 'src/app/testing';

describe('BrowserConfigComponent', () => {
  let component: BrowserConfigComponent;
  let fixture: ComponentFixture<BrowserConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserConfigComponent],
      providers: getTestProviders(),
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
