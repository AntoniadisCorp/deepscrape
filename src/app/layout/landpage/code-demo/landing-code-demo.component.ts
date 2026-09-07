import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { myIcons, RevealDirective } from 'src/app/shared';

@Component({
  selector: 'app-landing-code-demo',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, TranslateModule, RevealDirective],
  templateUrl: './landing-code-demo.component.html',
  styleUrl: './landing-code-demo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingCodeDemoComponent {
  readonly icons = myIcons;
}
