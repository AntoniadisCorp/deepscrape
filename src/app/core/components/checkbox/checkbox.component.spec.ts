import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { CheckboxComponent } from './checkbox.component';
import { getTestProviders } from 'src/app/testing';

describe('CheckboxComponent', () => {
  let component: CheckboxComponent;
  let fixture: ComponentFixture<CheckboxComponent>;
  let control: FormControl<boolean>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckboxComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(CheckboxComponent);
    component = fixture.componentInstance;
    control = new FormControl<boolean>(false, { nonNullable: true });
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('title', 'Accept terms');
    fixture.detectChanges();
  });

  it('reflects the initial false value from the control', () => {
    expect(component.control.value).toBeFalse();
  });

  it('reflects the control value after setValue(true)', () => {
    control.setValue(true);
    expect(component.control.value).toBeTrue();
  });

  it('stores the title input', () => {
    expect(component.title).toBe('Accept terms');
  });
});
