import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NgswUpdateService {

  constructor(private swUpdate: SwUpdate, @Inject(DOCUMENT) private document: Document) {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => {
          this.activateUpdate();
        });
    }
  }

   private activateUpdate() {  
    this.swUpdate.activateUpdate()  
      .then(() => this.document.location.reload())  
      .catch((error) => {  
        console.error('Failed to activate service worker update:', error);  
      });  
  }  
}
