import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';
import { getTestProviders } from 'src/app/testing';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.detectChanges();
  });

  it('close() emits the onClose output', fakeAsync(() => {
    const spy = jasmine.createSpy('onClose');
    component.onClose.subscribe(spy);
    component.close();
    flushMicrotasks();
    expect(spy).toHaveBeenCalled();
  }));

  it('close() sets the closed signal to true', () => {
    component.close();
    expect((component as any).closed()).toBeTrue();
  });

  it('close(true) also emits the onConfirm output', fakeAsync(() => {
    const spy = jasmine.createSpy('onConfirm');
    component.onConfirm.subscribe(spy);
    component.close(true);
    flushMicrotasks();
    expect(spy).toHaveBeenCalled();
  }));

  it('close() without confirm flag does not emit onConfirm', fakeAsync(() => {
    const spy = jasmine.createSpy('onConfirm');
    component.onConfirm.subscribe(spy);
    component.close();
    flushMicrotasks();
    expect(spy).not.toHaveBeenCalled();
  }));
});
