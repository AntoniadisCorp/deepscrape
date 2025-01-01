import { Routes } from '@angular/router';
import { MainRoutes, ServiceRoutes, UserRoutes } from './routes';

export const routes: Routes = [

    ...MainRoutes,

    ...UserRoutes,

    ...ServiceRoutes,

    { path: '**', loadComponent: () => import('./layout/full').then(m => m.NotFoundComponent) },
]
