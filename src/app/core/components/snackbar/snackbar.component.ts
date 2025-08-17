import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatIcon } from '@angular/material/icon';
import { NgClass, NgIf } from '@angular/common';

export enum SnackBarType {
  success = 'success',
  error = 'error',
  warning = 'warning',
  info = 'info'
}

@Component({
    selector: 'app-snackbar',
    imports: [NgClass, MatIcon, NgIf],
    templateUrl: './snackbar.component.html',
    styleUrl: './snackbar.component.scss',
    animations: [
        trigger('snackbarState', [
            state('void', style({
                transform: 'translateY(100%)',
                opacity: 0
            })),
            state('visible', style({
                transform: 'translateY(0)',
                opacity: 1
            })),
            transition('void => visible', animate('300ms ease-out')),
            transition('visible => void', animate('200ms ease-in'))
        ])
    ]
})
export class SnackbarComponent {
  @Input() message: string = ''
  @Input() action: string = ''
  @Input() type: SnackBarType = SnackBarType.info
  @Input() duration: number = 3000
  @Output() close = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<void>()

  visible: boolean = false
  snackbarState: 'visible' | 'void' = 'void';
  private hideTimeout: any;
  constructor(private cdr: ChangeDetectorRef) {}
  show(message: string, type: SnackBarType, action: string | '', duration?: number) {
    this.message = message;
    this.type = type;
    this.action = action;
    this.visible = true;
    
    // Use requestAnimationFrame instead of setTimeout for better performance
    requestAnimationFrame(() => {
      this.snackbarState = 'visible';
      this.cdr.markForCheck(); // Use markForCheck instead of detectChanges
    });
    
    if (this.duration > 0) {
      // Clear any existing timeout to prevent memory leaks
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
      }
      
      this.hideTimeout = setTimeout(() => this.hide(), duration || this.duration);
    }
  }

  hide() {
    this.visible = false;
    this.snackbarState = 'void';
    this.close.emit();
  }

  onActionClick() {
    this.actionClick.emit()
    this.hide()
  }


  snackbarTypeClass() {
    switch (this.type) {
      case 'success':
        return 'border-green-400 text-green-400';
      case 'error':
        return 'border-red-500 text-red-500';
      case 'warning':
        return 'border-yellow-500 text-yellow-500';
      case 'info':
        return 'border-blue-400 text-blue-400';
      default:
        return 'border-blue-400 text-blue-400';
    }
  }

  snackBarTypeClassIcon() {
    const info = 'text-blue-200 hover:text-blue-300 dark:text-blue-400/30 dark:hover:bg-gray-400/5 dark:hover:text-blue-400'
    switch (this.type) {
      case 'success':
        return 'text-green-200 hover:text-green-300 dark:text-green-400/30 dark:hover:bg-gray-400/5 dark:hover:text-green-400';
      case 'error':
        return 'text-red-200 hover:text-red-300 dark:text-red-400/30 dark:hover:bg-gray-400/5 dark:hover:text-red-400';
      case 'warning':
        return 'text-yellow-200 hover:text-yellow-300 dark:text-yellow-400/30 dark:hover:bg-gray-400/5 dark:hover:text-yellow-400';
      case 'info':
        return info;
      default:
        return info;
    }
  }
  ngOnDestroy() {
    // Clean up timeout to prevent memory leaks
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }
}
