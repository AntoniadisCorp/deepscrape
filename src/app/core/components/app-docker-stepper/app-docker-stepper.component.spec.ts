import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppDockerStepperComponent } from './app-docker-stepper.component';

describe('AppDockerStepperComponent', () => {
  let component: AppDockerStepperComponent;
  let fixture: ComponentFixture<AppDockerStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDockerStepperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppDockerStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
