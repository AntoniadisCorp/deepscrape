import { Routes } from '@angular/router';
import { MainRoutes, ServiceRoutes, UserRoutes, AdminRoutes } from './routes';

export const routes: Routes = [
    ...MainRoutes,
    ...UserRoutes,
    ...ServiceRoutes,
    ...AdminRoutes,
    { path: '**', loadComponent: () => import('./layout/full').then(m => m.NotFoundComponent) },
];
