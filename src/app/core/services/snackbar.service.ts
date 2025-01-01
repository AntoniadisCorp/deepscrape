import { Injectable } from '@angular/core';
import { SnackbarComponent, SnackBarType } from '../components';


@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private snackbarRef?: SnackbarComponent;

  setSnackbar(snackbar: SnackbarComponent) {
    this.snackbarRef = snackbar;
  }

  showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000
  ) {
    if (this.snackbarRef) {
      this.snackbarRef.show(message, type, action, duration);
    }
  }

  hideSnackBar() {
    if (this.snackbarRef) {
      this.snackbarRef.hide()
    }
  }
}