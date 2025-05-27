import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { DialogComponent } from '../dialog/dialog.component';

@Component({
  selector: 'app-dialog-actions',
  imports: [],
  templateUrl: './dialog-actions.component.html',
  styleUrl: './dialog-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogActionsComponent {
  label = input("OK")
  isConfirm = input(false)
  onClick = output()
  private dialog = inject(DialogComponent)


  handleClick() {
    this.onClick.emit()
    this.dialog.close(this.isConfirm())
  }
}
