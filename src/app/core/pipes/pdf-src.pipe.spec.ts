import { PdfSrcPipe } from './pdf-src.pipe';

describe('PdfSrcPipe', () => {
  it('returns empty string for falsy input', () => {
    const pipe = new PdfSrcPipe();
    expect(pipe.transform('')).toBe('');
  });

  it('prefixes base64 pdf string with data URL', () => {
    const pipe = new PdfSrcPipe();
    const encoded = 'JVBERi0xLjQK';

    expect(pipe.transform(encoded)).toBe('data:application/pdf;base64,JVBERi0xLjQK');
  });

  it('converts ArrayBuffer input into base64 data URL', () => {
    const pipe = new PdfSrcPipe();
    const bytes = new Uint8Array([37, 80, 68, 70]); // %PDF

    const result = pipe.transform(bytes.buffer);
    expect(result.startsWith('data:application/pdf;base64,')).toBeTrue();
    expect(result.length).toBeGreaterThan('data:application/pdf;base64,'.length);
  });
});
