import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DialogComponent } from '../dialog/dialog.component';

@Component({
  selector: 'app-dialog-actions',
  imports: [TranslateModule],
  templateUrl: './dialog-actions.component.html',
  styleUrl: './dialog-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogActionsComponent {
  label = input("COMMON.OK")
  isConfirm = input(false)
  onClick = output()
  private dialog = inject(DialogComponent)


  handleClick() {
    this.onClick.emit()
    this.dialog.close(this.isConfirm())
  }
}
