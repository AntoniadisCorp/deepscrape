import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppFooterComponent } from '../../layout/footer';
import { LandingSubheaderComponent } from '../../shared/landing-subheader/landing-subheader.component';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink, AppFooterComponent, LandingSubheaderComponent],
  templateUrl: './privacy.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {}
