import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatBytes'
})
export class FormatBytesPipe implements PipeTransform {

  transform(mb: number, decimals: number = 0): string {
    if (mb === 0) {
      return '0 MB';
    }

    const gb = mb / 1024;
    const dm = decimals < 0 ? 0 : decimals;

    return gb.toFixed(dm) + ' GB';
  }

}
