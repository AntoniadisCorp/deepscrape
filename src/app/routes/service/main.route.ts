import { Routes } from '@angular/router';
import { LoginGuard, verifyGuard } from 'src/app/core/guards';

export const MainRoutes: Routes = [

    {
        path: '',
        data: { title: 'service', animation: 'service' },
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadChildren: () => import('./login.route').then(r => r.authRoutes),
    },

    {
        path: 'signup',
        loadChildren: () => import('./signup.route').then(r => r.signRoutes),
    },
    {
        path: 'resetpassword',
        loadComponent: () => import('../../pages').then(m => m.ResetPasswordComponent),
        data: {
            title: 'resetpassword',
            animation: 'resetpassword'
        },
        canActivate: [LoginGuard],
    },
    {
        path: 'verification',
        loadComponent: () => import('../../pages').then(m => m.VerifyEmailComponent),
        data: {
            title: 'verification',
            animation: 'verification'
        },
        canActivate: [verifyGuard],
    },
    {
        path: 'action',
        loadComponent: () => import('../../pages').then(m => m.ActionHandlerComponent),
        data: {
            title: 'action',
            animation: 'action'
        },
        canActivate: [verifyGuard]
    }
]
