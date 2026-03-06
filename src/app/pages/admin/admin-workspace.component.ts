import { Component } from '@angular/core'
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { smoothfadeAnimation } from 'src/app/animations'
import { myIcons } from 'src/app/shared'

@Component({
  selector: 'app-admin-workspace',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, LucideAngularModule],
  templateUrl: './admin-workspace.component.html',
  styleUrl: './admin-workspace.component.scss',
  animations: [smoothfadeAnimation],
})
export class AdminWorkspaceComponent {
  readonly icons = myIcons
  private animationBindingReady = false
  readonly tabs = [
    { label: 'Analytics', route: '/admin/analytics', icon: 'gauge' },
    { label: 'Migration', route: '/admin/migration', icon: 'repeat' },
    { label: 'Runs', route: '/admin/migration/runs', icon: 'recent-activity' },
    { label: 'Backups', route: '/admin/migration/backups', icon: 'database' },
  ]

  constructor() {
    setTimeout(() => {
      this.animationBindingReady = true
    }, 0)
  }

  getRouteAnimationData(outlet?: RouterOutlet | null): string {
    if (!this.animationBindingReady) {
      return 'initial'
    }
    return outlet?.activatedRouteData?.['animation'] || 'initial'
  }
}
