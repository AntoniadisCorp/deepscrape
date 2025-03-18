import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppSidebarNavComponent } from '../app-sidebar-nav/app-sidebar-nav.component';
import { LoadingService } from 'src/app/core/services';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { asideBarAnimation } from 'src/app/animations';
import { Outsideclick } from 'src/app/core/directives';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, NgIf, AppSidebarNavComponent, MatProgressSpinner, Outsideclick],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
  animations: [
    asideBarAnimation
  ],
})
export class AppSidebarComponent {

  @Input() barClosed: boolean
  @Input() resizeScreen: boolean

  @Output() backDropPressed: EventEmitter<boolean> = new EventEmitter<boolean>()
  isLoading = false;

  constructor(private loadingService: LoadingService, private cdr: ChangeDetectorRef) {

    this.barClosed = false
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    this.loadingService.loadingSubject$.pipe(
      finalize(() => {
        this.loadingService.loadingSubject$.unsubscribe()
      })).subscribe((isLoading) => {
        this.isLoading = isLoading;
      },)

    this.cdr.detectChanges()
  }

  onSidebarClose(event: boolean): void {
    // like a backDrop click
    this.backDropPressed.emit(true)
  }
  backDropClicked($event: MouseEvent) {
    const element = $event.target as HTMLElement

    if (element.id === "barblurid") {
      this.backDropPressed.emit(true)
    }
  }
}
