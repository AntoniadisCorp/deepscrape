import { Routes } from '@angular/router';
import { UserResolver } from 'src/app/core/services';

export const MainRoutes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('../../pages').then(m => m.DashboardComponent),
        data: { title: 'Dashboard', animation: 'dashboard' },
    },
    {
        path: 'playground',
        loadComponent: () => import('../../pages').then(m => m.PlaygroundComponent),
        data: { title: 'Playground', animation: 'playground' },
    },
    {
        path: 'crawlpack',
        loadComponent: () => import('../../pages').then(m => m.CrawlPackComponent),
        loadChildren: () => import('./crawlpack.route').then(m => m.crawlerPackRoutes),
        data: { title: 'Crawl Pack', animation: 'parentcrawlpack' },
    },
    {
        path: 'operations',
        loadComponent: () => import('../../pages').then(m => m.OperationsComponent),
        resolve: { user: UserResolver },
        data: { title: 'Operations', animation: 'operations' },
    },
    {
        path: 'billing',
        loadComponent: () => import('../../pages').then(m => m.BillingComponent),
        loadChildren: () => import('./billing.route').then(m => m.billingRoutes),
        data: { title: 'Billing', animation: 'billing' },
    },
    {
        path: 'settings',
        data: { title: 'Account', animation: 'settings' },
        loadComponent: () => import('../../pages').then(m => m.AccountSettingsComponent),
        loadChildren: () => import('./settings.route').then(m => m.settingsRoutes),
    },

]