import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StinputComponent } from './stinput.component';

describe('StinputComponent', () => {
  let component: StinputComponent;
  let fixture: ComponentFixture<StinputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StinputComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(StinputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
