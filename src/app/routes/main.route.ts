import { Routes } from '@angular/router';
import { LoginGuard } from '../core/guards';

export const MainRoutes: Routes = [


    {
        path: '', data: { title: 'Home', animation: 'home' }, pathMatch: 'full',
        loadComponent: () => import('../pages').then(m => m.HomeComponent),
    },
]