import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
  providedIn: 'root'
})
export class ToggleBtnService {

  private menuOpen = new BehaviorSubject<boolean>(false)
  menuOpen$ = this.menuOpen.asObservable();

  toggleMenu() {
    this.menuOpen.next(!this.menuOpen.value)
  }

  closeMenu() {
    this.menuOpen.next(false)
  }

  isOpen() {
    return this.menuOpen.value
  }
}
