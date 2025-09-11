import { Routes } from '@angular/router';
import { UserResolver } from 'src/app/core/services';

export const crawlerPackRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../../pages').then(m => m.CrawlerPackComponent),
        resolve: { user: UserResolver },
        data: { title: 'Crawl Pack', animation: 'crawlpack' },
        // redirectTo: 'keys'
    },
    {
        path: 'machines',
        loadComponent: () => import('../../pages').then(m => m.MachinesComponent),
        data: { title: 'Machines', animation: 'machines' },
    },
    {
        path: 'browser',
        loadComponent: () => import('../../pages').then(m => m.BrowserConfigComponent),
        data: { title: 'Browser Configuration', animation: 'browserconfig' },
    },
    {
        path: 'configuration',
        loadComponent: () => import('../../pages').then(m => m.CrawlConfigComponent),
        data: { title: 'Crawler Configuration', animation: 'crawlerconfig' },
    },

    {
        path: 'results',
        loadComponent: () => import('../../pages').then(m => m.CrawlResultsComponent),
        data: { title: 'Crawler Results', animation: 'crawlresults' },
    },
    {
        path: 'extraction',
        loadComponent: () => import('../../pages').then(m => m.ExtractStrategyComponent),
        data: { title: 'Extraction Strategies', animation: 'crawlextraction' },
    }

]