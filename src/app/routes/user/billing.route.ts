import { Routes } from "@angular/router";
import { LoginGuard } from "src/app/core/guards";

export const billingRoutes: Routes = [
    {
        path: '',
        // loadComponent: () => import('../../pages').then(m => m.PassesComponent),
        // canActivate: [LoginGuard],
        redirectTo: 'passes',
        pathMatch: 'full'
    },
    {
        path: "paymentintent", // 
        loadComponent: () => import('../../pages').then(m => m.SetupIntentComponent),
    },
    {
        path: 'paymentmethods',
        loadComponent: () => import('../../pages').then(m => m.PaymentMethodsComponent),
    },
    {
        path: 'plans',
        loadComponent: () => import('../../pages').then(m => m.PlansComponent),
    },
    {
        path: 'passes',
        loadComponent: () => import('../../pages').then(m => m.PassesComponent),
    }
];