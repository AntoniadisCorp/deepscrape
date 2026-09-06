import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ClipboardbuttonComponent } from './clipboardbutton.component';
import { getTestProviders } from 'src/app/testing';

describe('ClipboardbuttonComponent', () => {
  let component: ClipboardbuttonComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    TestBed.runInInjectionContext(() => {
      component = new ClipboardbuttonComponent();
    });
  });

  it('onClick immediately sets title to copied!', () => {
    component.onClick();
    expect((component as any).title).toBe('copied!');
  });

  it('onClick resets title to copy code after 800 ms', fakeAsync(() => {
    component.onClick();
    tick(800);
    expect((component as any).title).toBe('copy code');
  }));

  it('starts with title copy code', () => {
    expect((component as any).title).toBe('copy code');
  });
});
