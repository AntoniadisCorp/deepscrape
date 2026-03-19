import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { RadioButtonComponent } from './radio-button.component';
import { getTestProviders } from 'src/app/testing';

describe('RadioButtonComponent', () => {
  let component: RadioButtonComponent;
  let fixture: ComponentFixture<RadioButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioButtonComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(RadioButtonComponent);
    component = fixture.componentInstance;
    component.control = new FormControl<string>('', { nonNullable: true });
    component.value = 'value';
    fixture.detectChanges();
  });/* The code snippet `this.control = new FormControl('', { nonNullable: true, validators:
  [Validators.required] })` is attempting to create a new instance of a `FormControl` object
  and assign it to the `control` property of the `RadioButtonComponent` class. However, there
  are a couple of issues with this code: */


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
