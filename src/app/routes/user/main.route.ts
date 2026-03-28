import { Routes } from '@angular/router';
import { AdminGuard } from 'src/app/core/guards';
import { UserResolver } from 'src/app/core/services';
import { paywallGuard } from 'src/app/core/guards';
import { authzGuard } from 'src/app/core/guards';

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
        canActivate: [paywallGuard, authzGuard],
        data: {
            title: 'Crawl Pack',
            animation: 'parentcrawlpack',
            authz: { resource: 'crawl', action: 'execute' },
        },
    },
    {
        path: 'operations',
        loadComponent: () => import('../../pages').then(m => m.OperationsComponent),
        resolve: { user: UserResolver },
        canActivate: [paywallGuard, authzGuard],
        data: {
            title: 'Operations',
            animation: 'operations',
            authz: { resource: 'crawl', action: 'execute' },
        },
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
    {
        path: 'admin',
        data: { title: 'Admin', animation: 'admin' },
        loadComponent: () => import('../../pages').then(m => m.AdminWorkspaceComponent),
        loadChildren: () => import('./admin.route').then(m => m.AdminRoutes),
        canActivate: [AdminGuard],
    },
]