import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppTabsComponent } from './tabs.component';
import { getTestProviders } from 'src/app/testing';

describe('AppTabsComponent', () => {
  let component: AppTabsComponent;
  let fixture: ComponentFixture<AppTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTabsComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(AppTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
