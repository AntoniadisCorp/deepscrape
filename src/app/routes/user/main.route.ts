import { Routes } from '@angular/router';
import { UserResolver } from 'src/app/core/services';

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
        path: 'crawlpack',
        loadComponent: () => import('../../pages').then(m => m.CrawlPackComponent),
        loadChildren: () => import('./crawlpack.route').then(m => m.crawlerPackRoutes)
    },
    {
        path: 'operations',
        loadComponent: () => import('../../pages').then(m => m.OperationsComponent),
        resolve: { user: UserResolver },
    },
    {
        path: 'billing',
        loadComponent: () => import('../../pages').then(m => m.BillingComponent),
        loadChildren: () => import('./billing.route').then(m => m.billingRoutes)
    },
    {
        path: 'settings',
        data: { title: 'Account', animation: 'account' },
        loadComponent: () => import('../../pages').then(m => m.AccountSettingsComponent),
        loadChildren: () => import('./settings.route').then(m => m.settingsRoutes)
    },

]