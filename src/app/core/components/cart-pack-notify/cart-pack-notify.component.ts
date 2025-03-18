import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ToggleBtnService } from '../../services';

@Component({
  selector: 'app-cart-pack-notify',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './cart-pack-notify.component.html',
  styleUrl: './cart-pack-notify.component.scss'
})
export class CartPackNotifyComponent {

  private showDropDown: boolean = false
  private btnService = inject(ToggleBtnService)

  constructor() {
  }

  protected toggleCartDropdown() {

    this.btnService.toggleMenu()
  }
}
