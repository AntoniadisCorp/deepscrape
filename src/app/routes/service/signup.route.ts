import { Routes } from "@angular/router";

export const signRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../pages').then(m => m.SignupComponent),
        data: {
            title: 'signup'
        }
    }
];
