import { Routes } from '@angular/router';

export const crawlerPackRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../../pages').then(m => m.WebCrawlerComponent),
        // redirectTo: 'keys'
    },
    {
        path: 'machines',
        loadComponent: () => import('../../pages').then(m => m.MachinesComponent),
    },
    {
        path: 'browser',
        loadComponent: () => import('../../pages').then(m => m.BrowserConfigComponent),
    },
    {
        path: 'configuration',
        loadComponent: () => import('../../pages').then(m => m.CrawlConfigComponent),
    },

    {
        path: 'results',
        loadComponent: () => import('../../pages').then(m => m.CrawlResultsComponent),
    },
    {
        path: 'extraction',
        loadComponent: () => import('../../pages').then(m => m.ExtractStrategyComponent),
    }

]