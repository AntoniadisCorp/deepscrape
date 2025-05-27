import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogActionsComponent } from './dialog-actions.component';

describe('DialogActionsComponent', () => {
  let component: DialogActionsComponent;
  let fixture: ComponentFixture<DialogActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
