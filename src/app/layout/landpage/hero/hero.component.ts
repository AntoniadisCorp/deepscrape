import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { myIcons } from 'src/app/shared';

@Component({
  selector: 'app-hero',
  imports: [LucideAngularModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  readonly icons = myIcons
}
