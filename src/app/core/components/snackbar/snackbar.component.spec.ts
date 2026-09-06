import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SnackbarComponent, SnackBarType } from './snackbar.component';
import { getTestProviders } from 'src/app/testing';

describe('SnackbarComponent', () => {
  let component: SnackbarComponent;
  let fixture: ComponentFixture<SnackbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnackbarComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(SnackbarComponent);
    component = fixture.componentInstance;
    component.duration = 0;
    fixture.detectChanges();
  });

  it('show() sets visible to true and stores the message', () => {
    component.show('Hello world', SnackBarType.success, '');
    expect(component.visible).toBeTrue();
    expect(component.message).toBe('Hello world');
  });

  it('hide() sets visible to false and emits close', () => {
    const spy = jasmine.createSpy('close');
    component.close.subscribe(spy);
    component.hide();
    expect(component.visible).toBeFalse();
    expect(component.snackbarState).toBe('void');
    expect(spy).toHaveBeenCalled();
  });

  it('snackbarTypeClass returns green classes for success type', () => {
    component.type = SnackBarType.success;
    expect(component.snackbarTypeClass).toContain('green');
  });

  it('snackbarTypeClass returns red classes for error type', () => {
    component.type = SnackBarType.error;
    expect(component.snackbarTypeClass).toContain('red');
  });
});
