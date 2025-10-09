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

    this.snackbarRef?.show(message, type, action, duration);

  }

  hideSnackBar() {

    this.snackbarRef?.hide()

  }
}