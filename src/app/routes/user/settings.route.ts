import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [

    {
        path: 'keys',
        loadComponent: () => import('../../pages').then(m => m.ApiKeysComponent),
    },
]