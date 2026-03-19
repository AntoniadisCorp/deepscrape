import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { StinputComponent } from './stinput.component';
import { getTestProviders } from 'src/app/testing';

describe('StinputComponent', () => {
  let component: StinputComponent;
  let fixture: ComponentFixture<StinputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StinputComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(StinputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('control', new FormControl<string>('initial', { nonNullable: true }));
    fixture.componentRef.setInput('label', 'URL');
    fixture.detectChanges();
  });

  it('should track focus state changes', () => {
    component.doFocus();
    expect(component.inputFocused).toBeTrue();

    component.doBlur();
    expect(component.inputFocused).toBeFalse();
  });

  it('should toggle password visibility when label is Password', () => {
    fixture.componentRef.setInput('label', 'Password');
    component.rightIcon = 'visibility';
    fixture.detectChanges();

    const inputEl = component.stInput.nativeElement;
    expect(inputEl.type).toBe('password');

    component.togglePasswordVisibility();
    expect(component.rightIcon).toBe('visibility_off');
    expect(inputEl.type).toBe('text');

    component.togglePasswordVisibility();
    expect(component.rightIcon).toBe('visibility');
    expect(inputEl.type).toBe('password');
  });
});
