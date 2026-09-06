import { FormatBytesPipe } from './format-bytes.pipe';

describe('FormatBytesPipe', () => {
  it('returns 0 MB for zero input', () => {
    const pipe = new FormatBytesPipe();
    expect(pipe.transform(0)).toBe('0 MB');
  });

  it('converts MB to GB with default decimals', () => {
    const pipe = new FormatBytesPipe();
    expect(pipe.transform(1024)).toBe('1 GB');
  });

  it('uses 0 decimals when decimals argument is negative', () => {
    const pipe = new FormatBytesPipe();
    expect(pipe.transform(1536, -2)).toBe('2 GB');
  });
});
