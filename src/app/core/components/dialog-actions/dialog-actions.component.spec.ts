import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogActionsComponent } from './dialog-actions.component';
import { DialogComponent } from '../dialog/dialog.component';
import { getTestProviders } from 'src/app/testing';

describe('DialogActionsComponent', () => {
  let component: DialogActionsComponent;
  let fixture: ComponentFixture<DialogActionsComponent>;
  let mockDialog: { close: jasmine.Spy };

  beforeEach(async () => {
    mockDialog = { close: jasmine.createSpy('close') };
    await TestBed.configureTestingModule({
      imports: [DialogActionsComponent],
      providers: [
        ...getTestProviders(),
        { provide: DialogComponent, useValue: mockDialog },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('handleClick emits the onClick output', () => {
    const spy = jasmine.createSpy('onClick');
    component.onClick.subscribe(spy);
    component.handleClick();
    expect(spy).toHaveBeenCalled();
  });

  it('handleClick calls dialog.close(false) by default', () => {
    component.handleClick();
    expect(mockDialog.close).toHaveBeenCalledWith(false);
  });

  it('handleClick calls dialog.close(true) when isConfirm input is true', () => {
    fixture.componentRef.setInput('isConfirm', true);
    component.handleClick();
    expect(mockDialog.close).toHaveBeenCalledWith(true);
  });
});
