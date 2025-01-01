import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RadioToggleComponent } from './radiotoggle.component';

describe('RadioToggleComponent', () => {
  let component: RadioToggleComponent;
  let fixture: ComponentFixture<RadioToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioToggleComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RadioToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
