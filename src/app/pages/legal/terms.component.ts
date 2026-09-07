import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppFooterComponent } from '../../layout/footer';

@Component({
  selector: 'app-terms',
  imports: [RouterLink, AppFooterComponent],
  templateUrl: './terms.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsComponent {}
