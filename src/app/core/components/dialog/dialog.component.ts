import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RippleDirective } from '../../directives';
import { MatIcon } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { slideInModalAnimation } from 'src/app/animations';
import { DialogActionsComponent } from '../dialog-actions/dialog-actions.component';

@Component({
  selector: 'app-dialog',
  imports: [MatIcon, RippleDirective, DialogActionsComponent, TranslateModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  animations: [slideInModalAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent {


  title = input.required<string>()
  subtitle = input<string>()
  cancelLabel = input('COMMON.CANCEL')
  confirmLabel = input('COMMON.DELETE')
  onClose = output<void>()
  onConfirm = output<void>()

  protected closed = signal(false)
  close(confirm: boolean = false) {
    this.closed.set(true)
    if (confirm) {
      this.onConfirm.emit()
    }
    // Defer onClose so the parent's destroy cycle runs after all emissions complete,
    // preventing NG0953 "Unexpected emit for destroyed OutputRef".
    queueMicrotask(() => this.onClose.emit())
  }
}
