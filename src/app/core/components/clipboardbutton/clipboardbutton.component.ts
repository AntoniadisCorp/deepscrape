import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'app-clipboard-button',
    imports: [MatIcon, NgClass],
    templateUrl: './clipboardbutton.component.html',
    styleUrl: './clipboardbutton.component.scss'
})
export class ClipboardbuttonComponent {

  protected title = 'copy code'

  @Input() inline?: boolean = true;

  onClick() {
    this.title = 'copied!';
    setTimeout(() => {
      this.title = 'copy code'
    }, 1000)
  }
}
