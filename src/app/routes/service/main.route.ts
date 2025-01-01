import { Routes } from '@angular/router';
import { LoginGuard } from 'src/app/core/guards';

export const MainRoutes: Routes = [

    {
        path: '',
        data: { title: 'service', animation: 'service' },
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        data: {
            title: 'signin',
            animation: 'signin'
        },
        loadChildren: () => import('./login.route').then(r => r.authRoutes),
    },

    {
        path: 'signup',
        data: {
            title: 'signup',
            animation: 'signup'
        },
        loadChildren: () => import('./signup.route').then(r => r.signRoutes),
    },
    {
        path: 'resetpassword',
        loadComponent: () => import('../../pages').then(m => m.ResetPasswordComponent),
        data: {
            title: 'resetpassword'
        },
        canActivate: [LoginGuard],
    }
]