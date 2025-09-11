import { NgClass } from '@angular/common';
import { Component, DestroyRef, inject, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { timer } from 'rxjs/internal/observable/timer';

@Component({
    selector: 'app-clipboard-button',
    imports: [MatIcon, NgClass],
    templateUrl: './clipboardbutton.component.html',
    styleUrl: './clipboardbutton.component.scss'
})
export class ClipboardbuttonComponent {

  private destroyRef = inject(DestroyRef)
  protected title = 'copy code'

  @Input() inline?: boolean = true;

  onClick() {
    this.title = 'copied!'

    timer(800)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.title = 'copy code'
            })
  }
}
