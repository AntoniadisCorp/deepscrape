import { FormControlPipe } from './formcontrol.pipe';
import { FormControl } from '@angular/forms';

describe('FormControlPipe', () => {
  it('returns the same control instance cast as FormControl', () => {
    const pipe = new FormControlPipe();
    const control = new FormControl('value');

    expect(pipe.transform(control)).toBe(control);
  });

  it('preserves validators on transformed control', () => {
    const pipe = new FormControlPipe();
    const control = new FormControl('', { nonNullable: true });
    control.addValidators(() => ({ required: true }));

    const transformed = pipe.transform(control);
    transformed.updateValueAndValidity();

    expect(transformed).toBe(control);
    expect(transformed.errors).toEqual({ required: true });
  });

  it('returns null at runtime when control is null input', () => {
    const pipe = new FormControlPipe();

    expect(pipe.transform(null as any)).toBeNull();
  });
});
