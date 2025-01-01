import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsetModalComponent } from './consent-modal.component';

describe('ConsetModalComponent', () => {
  let component: ConsetModalComponent;
  let fixture: ComponentFixture<ConsetModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsetModalComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ConsetModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
