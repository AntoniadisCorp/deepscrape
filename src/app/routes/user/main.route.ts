import { Routes } from '@angular/router';
import { AdminGuard } from 'src/app/core/guards';
import { UserResolver } from 'src/app/core/services';
import { paywallGuard } from 'src/app/core/guards';
import { authzGuard } from 'src/app/core/guards';

export const MainRoutes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('../../pages').then(m => m.DashboardComponent),
        canActivate: [authzGuard],
        data: {
            title: 'Dashboard',
            animation: 'dashboard',
            authz: { resource: 'crawl', action: 'read' },
        },
    },
    {
        path: 'playground',
        loadComponent: () => import('../../pages').then(m => m.PlaygroundComponent),
        canActivate: [authzGuard],
        data: {
            title: 'Playground',
            animation: 'playground',
            authz: { resource: 'ai', action: 'execute' },
        },
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
        canActivate: [authzGuard],
        data: {
            title: 'Billing',
            animation: 'billing',
            authz: { resource: 'billing', action: 'read' },
        },
    },
    {
        path: 'settings',
        canActivate: [authzGuard],
        data: {
            title: 'Account',
            animation: 'settings',
            authz: { resource: 'organization', action: 'read' },
        },
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