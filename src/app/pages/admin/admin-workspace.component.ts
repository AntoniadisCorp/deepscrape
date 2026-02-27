import { Component } from '@angular/core'
import { NgClass, NgFor } from '@angular/common'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'

@Component({
  selector: 'app-admin-workspace',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgClass],
  templateUrl: './admin-workspace.component.html',
  styleUrl: './admin-workspace.component.scss',
})
export class AdminWorkspaceComponent {
  readonly tabs = [
    { label: 'Analytics', route: '/admin/analytics' },
    { label: 'Migration', route: '/admin/migration' },
  ]
}
