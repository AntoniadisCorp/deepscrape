import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClipboardbuttonComponent } from './clipboardbutton.component';

describe('ClipboardbuttonComponent', () => {
  let component: ClipboardbuttonComponent;
  let fixture: ComponentFixture<ClipboardbuttonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClipboardbuttonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClipboardbuttonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
