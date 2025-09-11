import { Component } from '@angular/core';
import { AppFooterComponent } from '../../footer'
// import { AppHeaderComponent } from '../../header';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-not-found',
    imports: [RouterLink, AppFooterComponent],
    templateUrl: './app-not-found.component.html',
    styleUrl: './app-not-found.component.scss'
})
export class NotFoundComponent {

}