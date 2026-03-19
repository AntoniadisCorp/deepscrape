import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogActionsComponent } from './dialog-actions.component';
import { DialogComponent } from '../dialog/dialog.component';
import { getTestProviders } from 'src/app/testing';

describe('DialogActionsComponent', () => {
  let component: DialogActionsComponent;
  let fixture: ComponentFixture<DialogActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogActionsComponent],
      providers: [
        ...getTestProviders(),
        { provide: DialogComponent, useValue: { close: jasmine.createSpy('close') } },
      ],
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
