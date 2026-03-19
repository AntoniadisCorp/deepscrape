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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
