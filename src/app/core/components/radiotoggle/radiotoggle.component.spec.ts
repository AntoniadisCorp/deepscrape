import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { RadioToggleComponent } from './radiotoggle.component';
import { getTestProviders } from 'src/app/testing';

describe('RadioToggleComponent', () => {
  let component: RadioToggleComponent;
  let fixture: ComponentFixture<RadioToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioToggleComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(RadioToggleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('control', new FormControl<boolean>(false, { nonNullable: true }));
    fixture.detectChanges();
  });

  it('setTitle returns "Off" for false with no title', () => {
    expect(component.setTitle()).toBe('Off');
  });

  it('setTitle returns "On" for true with no title', () => {
    component.control.setValue(true);
    expect(component.setTitle()).toBe('On');
  });

  it('setTitle splits a custom title by slash', () => {
    component.title = 'Yes/No';
    component.control.setValue(true);
    expect(component.setTitle()).toBe('Yes');
    component.control.setValue(false);
    expect(component.setTitle()).toBe('No');
  });
});
