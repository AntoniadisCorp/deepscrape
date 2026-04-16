import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationsComponent } from './operations.component';
import { getTestProviders } from 'src/app/testing';

describe('OperationsComponent', () => {
  let component: OperationsComponent;
  let fixture: ComponentFixture<OperationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(OperationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply grow class via host binding', () => {
    const host: HTMLElement = fixture.nativeElement;

    expect(host.classList.contains('grow')).toBeTrue();
  });

  it('should initialize required url control as invalid when empty', () => {
    expect(component.url.value).toBe('');
    expect(component.url.valid).toBeFalse();
  });

  it('should initialize model AI control with claude provider code', () => {
    expect(component.modelAI.value.code).toBe('claude');
  });
});
