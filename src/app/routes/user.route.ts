import { Routes } from '@angular/router';
import { authGuard } from '../core/guards';

export const UserRoutes: Routes = [{
    path: '',
    loadComponent: () => import('../layout/full').then(c => c.AppUserLayoutComponent),
    data: { title: 'user', animation: 'user' },
    loadChildren: () => import('./user/main.route').then(m => m.MainRoutes),
    canActivate: [authGuard],
}]