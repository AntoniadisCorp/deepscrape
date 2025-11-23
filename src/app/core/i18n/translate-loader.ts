import { TranslateLoader } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

/* The `MultiTranslateHttpLoader` class in TypeScript is used to load multiple translation resources
via HTTP requests and merge them into a single translation object. */
export class MultiTranslateHttpLoader implements TranslateLoader {
  constructor(
    private http: HttpClient,
    private resources: string[]
  ) {}

  getTranslation(lang: string): Observable<any> {
    return forkJoin(
      this.resources.map(path => this.http.get(`${path}/${lang}.json`))
    ).pipe(
      map(responseArrays => Object.assign({}, ...responseArrays))
    );
  }
}
