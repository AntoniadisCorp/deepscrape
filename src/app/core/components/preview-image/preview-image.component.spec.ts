import { TestBed } from '@angular/core/testing';
import { PreviewImageComponent } from './preview-image.component';
import { getTestProviders } from 'src/app/testing';

describe('PreviewImageComponent', () => {
  let component: PreviewImageComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    TestBed.runInInjectionContext(() => {
      component = new PreviewImageComponent();
    });
  });

  it('writeValue stores the value', () => {
    component.writeValue('data:image/png;base64,abc');
    expect(component.value).toBe('data:image/png;base64,abc');
  });

  it('writeValue accepts null', () => {
    component.writeValue(null);
    expect(component.value).toBeNull();
  });

  it('registerOnChange stores the callback', () => {
    const cb = jasmine.createSpy('onChange');
    component.registerOnChange(cb);
    expect(component.onChange).toBe(cb);
  });

  it('registerOnTouched stores the callback', () => {
    const cb = jasmine.createSpy('onTouched');
    component.registerOnTouched(cb);
    expect(component.onTouched).toBe(cb);
  });
});
