import { Routes } from "@angular/router";
// import { authGuard } from "src/app/core/guards";
import { LoginGuard } from "src/app/core/guards";

export const authRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../pages').then(m => m.LoginComponent),
        data: {
            title: 'login',
            animation: 'login'
        },
        canActivate: [LoginGuard],
        canActivateChild: [LoginGuard]
    }
];