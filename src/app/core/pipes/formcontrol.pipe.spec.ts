import { FormControlPipe } from './formcontrol.pipe';
import { FormControl } from '@angular/forms';

describe('FormControlPipe', () => {
  it('returns the same control instance cast as FormControl', () => {
    const pipe = new FormControlPipe();
    const control = new FormControl('value');

    expect(pipe.transform(control)).toBe(control);
  });
});
