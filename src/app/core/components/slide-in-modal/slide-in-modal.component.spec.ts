import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlideInModalComponent } from './slide-in-modal.component';

describe('SlideInModalComponent', () => {
  let component: SlideInModalComponent;
  let fixture: ComponentFixture<SlideInModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlideInModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideInModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
