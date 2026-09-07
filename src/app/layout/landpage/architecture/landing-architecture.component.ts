import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { myIcons, RevealDirective } from 'src/app/shared';

@Component({
  selector: 'app-landing-architecture',
  standalone: true,
  imports: [LucideAngularModule, TranslateModule, RevealDirective],
  templateUrl: './landing-architecture.component.html',
  styleUrl: './landing-architecture.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingArchitectureComponent {
  readonly icons = myIcons;
}
