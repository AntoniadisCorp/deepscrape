import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppUserLayoutComponent } from './app-user-layout.component';
import { getTestProviders } from 'src/app/testing';

describe('AppUserLayoutComponent', () => {
  let component: AppUserLayoutComponent;
  let fixture: ComponentFixture<AppUserLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppUserLayoutComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppUserLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
