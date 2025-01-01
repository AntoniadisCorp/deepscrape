import { Routes } from '@angular/router';

export const MainRoutes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('../../pages').then(m => m.DashboardComponent),
    },

    {
        path: 'billing',
        loadComponent: () => import('../../pages').then(m => m.BillingComponent)
    }
]