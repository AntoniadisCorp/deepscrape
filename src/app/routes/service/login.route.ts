import { Routes } from "@angular/router";
import { LoginGuard } from "src/app/core/guards";

export const authRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../pages').then(m => m.LoginComponent),
        canActivate: [LoginGuard],
        canActivateChild: [LoginGuard]
    }
];