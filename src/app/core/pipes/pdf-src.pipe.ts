import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'pdfSrc' })
export class PdfSrcPipe implements PipeTransform {
  transform(pdf: string | ArrayBuffer | Uint8Array): string {
    if (!pdf) return '';
    // If it's already a base64 string, use it directly
    if (typeof pdf === 'string' && pdf.trim().startsWith('JVBER')) {
      // Looks like base64 PDF (starts with 'JVBER')
      return 'data:application/pdf;base64,' + pdf;
    }
    // If it's binary, convert to base64
    if (pdf instanceof ArrayBuffer || pdf instanceof Uint8Array) {
      let binary = '';
      const bytes = pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return 'data:application/pdf;base64,' + btoa(binary);
    }
    // Fallback: treat as base64
    return 'data:application/pdf;base64,' + pdf;
  }
}