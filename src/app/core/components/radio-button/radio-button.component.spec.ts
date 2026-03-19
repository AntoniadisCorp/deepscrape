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
    fixture.componentRef.setInput('control', new FormControl<string>('', { nonNullable: true }));
    fixture.componentRef.setInput('value', 'test-value');
    fixture.detectChanges();
  });

  it('returns fallback label when no title is set', () => {
    expect(component.setTitle()).toBe('set a Title');
  });

  it('returns the title when set', () => {
    component.title = 'My Option';
    expect(component.setTitle()).toBe('My Option');
  });

  it('reflects control value changes', () => {
    component.control.setValue('test-value');
    expect(component.control.value).toBe('test-value');
  });
});
