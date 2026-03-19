import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppDockerStepperComponent } from './app-docker-stepper.component';
import { getTestProviders } from 'src/app/testing';

describe('AppDockerStepperComponent', () => {
  let component: AppDockerStepperComponent;
  let fixture: ComponentFixture<AppDockerStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDockerStepperComponent],
      providers: getTestProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(AppDockerStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes formStep1, formStep2, and formStep3 on ngOnInit', () => {
    expect(component.formStep1).toBeTruthy();
    expect(component.formStep2).toBeTruthy();
    expect(component.formStep3).toBeTruthy();
  });

  it('updateStep1Validators default: clears dockerHubUrl validators', () => {
    component.updateStep1Validators('default');
    expect(component.formStep1.get('dockerHubUrl')?.errors).toBeNull();
  });

  it('updateStep1Validators url: marks dockerHubUrl required when empty', () => {
    component.updateStep1Validators('url');
    expect(component.formStep1.get('dockerHubUrl')?.hasError('required')).toBeTrue();
  });
});
