import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { DropdownComponent } from './dropdown.component';
import { getTestProviders } from 'src/app/testing';

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;
  const options = [{ name: 'Option 1', code: 'o1' }, { name: 'Option 2', code: 'o2' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(DropdownComponent);
    component = fixture.componentInstance;
    component.control = new FormControl<{ name: string; code: string } | null>(options[0]) as any;
    component.options = options;
    fixture.detectChanges();
  });

  it('onToggle flips isOpen to true on first call', () => {
    component.onToggle();
    expect(component.isOpen).toBeTrue();
  });

  it('onToggle flips isOpen back to false on second call', () => {
    component.onToggle();
    component.onToggle();
    expect(component.isOpen).toBeFalse();
  });

  it('onOptionSelected emits the selected option and updates the control value', () => {
    const selectSpy = jasmine.createSpy('select');
    component.select.subscribe(selectSpy);
    spyOn(component, 'focus');
    component.onOptionSelected(options[1]);
    expect(selectSpy).toHaveBeenCalledWith(options[1]);
    expect(component.control.value).toEqual(options[1]);
  });

  it('doFocus sets isFocus to true', () => {
    component.doFocus();
    expect(component.isFocus).toBeTrue();
  });
});
