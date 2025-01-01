import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-clipboard-button',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './clipboardbutton.component.html',
  styleUrl: './clipboardbutton.component.scss'
})
export class ClipboardbuttonComponent {

  protected title = 'copy code'
  onClick() {
    this.title = 'copied!';
    setTimeout(() => {
      this.title = 'copy code'
    }, 1000)
  }
}
