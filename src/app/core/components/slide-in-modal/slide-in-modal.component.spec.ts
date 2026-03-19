import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { SlideInModalComponent } from './slide-in-modal.component';
import { getTestProviders } from 'src/app/testing';

describe('SlideInModalComponent', () => {
  let component: SlideInModalComponent;
  let fixture: ComponentFixture<SlideInModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlideInModalComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideInModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', new FormControl<boolean>(false, { nonNullable: true }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
