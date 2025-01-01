import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppServiceLayoutComponent } from './app-service-layout.component';

describe('AppServiceLayoutComponent', () => {
  let component: AppServiceLayoutComponent;
  let fixture: ComponentFixture<AppServiceLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppServiceLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppServiceLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
