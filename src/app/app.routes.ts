import { Routes } from '@angular/router';
import { MainRoutes, ServiceRoutes, UserRoutes } from './routes';

export const routes: Routes = [
    ...MainRoutes,
    ...ServiceRoutes,
    ...UserRoutes,
    { path: '**', loadComponent: () => import('./layout/full').then(m => m.NotFoundComponent) },
];
