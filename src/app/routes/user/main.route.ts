import { Routes } from '@angular/router';

export const MainRoutes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('../../pages').then(m => m.DashboardComponent),
    },
    {
        path: 'playground',
        loadComponent: () => import('../../pages').then(m => m.PlaygroundComponent),
    },

    {
        path: 'billing',
        loadComponent: () => import('../../pages').then(m => m.BillingComponent),
        loadChildren: () => import('./billing.route').then(m => m.billingRoutes)
    },
    {
        path: 'settings',
        loadComponent: () => import('../../pages').then(m => m.BillingComponent),
        loadChildren: () => import('./settings.route').then(m => m.settingsRoutes)
    },

]