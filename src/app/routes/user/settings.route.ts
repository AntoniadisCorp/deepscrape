import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'keys'
    },

    {
        path: 'keys',
        loadComponent: () => import('../../pages').then(m => m.ApiKeysComponent),
    },
]