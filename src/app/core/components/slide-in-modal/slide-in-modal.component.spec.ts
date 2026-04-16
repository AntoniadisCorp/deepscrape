import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SlideInModalComponent } from './slide-in-modal.component';
import { getTestProviders } from 'src/app/testing';

describe('SlideInModalComponent', () => {
  let component: SlideInModalComponent;
  let fixture: ComponentFixture<SlideInModalComponent>;
  let isOpenControl: FormControl<boolean>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlideInModalComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(SlideInModalComponent);
    component = fixture.componentInstance;
    isOpenControl = new FormControl<boolean>(false, { nonNullable: true });
    fixture.componentRef.setInput('isOpen', isOpenControl);
    fixture.detectChanges();
  });

  it('ngOnInit subscribes to isOpen — setValue(true) sets opened to true', () => {
    isOpenControl.setValue(true);
    expect((component as any).opened).toBeTrue();
  });

  it('close() immediately sets opened to false', () => {
    isOpenControl.setValue(true);
    component.close();
    expect((component as any).opened).toBeFalse();
  });

  it('close() sets isOpen to false after 300 ms', fakeAsync(() => {
    isOpenControl.setValue(true);
    component.close();
    tick(300);
    expect(isOpenControl.value).toBeFalse();
  }));
});
