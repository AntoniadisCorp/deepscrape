import { Routes } from '@angular/router';
import { UserResolver } from 'src/app/core/services';


export const settingsRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'profile'
    },
    {
        path: 'profile',
        loadComponent: () => import('../../pages').then(m => m.ProfileTabComponent),
        resolve: { user: UserResolver },
    },
    {
        path: 'general',
        loadComponent: () => import('../../pages').then(m => m.GeneralTabComponent),
    },
    {
        path: 'payment',
        loadComponent: () => import('../../pages').then(m => m.PaymentTabComponent),
    },
    {
        path: 'security',
        loadComponent: () => import('../../pages').then(m => m.SecurityTabComponent),
    },
    {
        path: 'keys',
        loadComponent: () => import('../../pages').then(m => m.ApiKeysComponent),
    },
]
