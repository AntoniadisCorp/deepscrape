import { Routes } from '@angular/router';

export const ServiceRoutes: Routes = [

    {
        path: 'service',
        loadComponent: () => import('../layout/full').then(c => c.AppServiceLayoutComponent),
        data: { title: 'service', animation: 'service' },
        loadChildren: () => import('./service/main.route').then(m => m.MainRoutes)
    }
]