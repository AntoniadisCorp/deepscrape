import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppFooterComponent } from '../../layout/footer';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink, AppFooterComponent],
  templateUrl: './privacy.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {}
