import { ChangeDetectionStrategy, Component, HostListener, inject, Input, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ClipboardbuttonComponent } from '../clipboardbutton/clipboardbutton.component';
import { ApiKey } from '../../types';
import { ApiKeyService } from '../../services';

@Component({
  selector: 'app-popup-menu',
  imports: [],
  templateUrl: './popup-menu.component.html',
  styleUrl: './popup-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupMenuComponent {
  private apiKeyService = inject(ApiKeyService)
  @ViewChild('popupElement') popupElement: any;

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const menu = this.popupElement.nativeElement as Element
    if (menu && !menu.contains(event.target as Node)) {
      this.setMenuInvisible()
    }
  }

  @Input() popupValue: any

  constructor() { }
  setMenuInvisible() {
    this.apiKeyService.setMenuInVisible(this.popupValue)
  }
}
