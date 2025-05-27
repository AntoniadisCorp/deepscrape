import { Component, input, output, signal } from '@angular/core';
import { RippleDirective } from '../../directives';
import { MatIcon } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { slideInModalAnimation } from 'src/app/animations';
import { DialogActionsComponent } from '../dialog-actions/dialog-actions.component';

@Component({
  selector: 'app-dialog',
  imports: [MatIcon, RippleDirective, DialogActionsComponent],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  animations: [slideInModalAnimation]
})
export class DialogComponent {


  title = input.required<string>()
  onClose = output<void>()
  onConfirm = output<void>()

  protected closed = signal(false)
  close(confirm: boolean = false) {
    this.onClose.emit()
    this.closed.set(true)
    if (confirm) {
      this.onConfirm.emit()
    }
  }
}
