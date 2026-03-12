import { Routes } from "@angular/router";
import { paywallGuard } from "src/app/core/guards";

export const billingRoutes: Routes = [
    {
        path: '',
        // loadComponent: () => import('../../pages').then(m => m.PassesComponent),
        // canActivate: [LoginGuard],
        redirectTo: 'plans',
        pathMatch: 'full'
    },
    {
        path: "paymentintent", // 
        loadComponent: () => import('../../pages').then(m => m.SetupIntentComponent),
        data: { animation: 'billing-paymentintent' },
    },
    {
        path: 'paymentmethods',
        loadComponent: () => import('../../pages').then(m => m.PaymentMethodsComponent),
        data: { animation: 'billing-paymentmethods' },
    },
    {
        path: 'plans',
        loadComponent: () => import('../../pages').then(m => m.PlansComponent),
        data: { animation: 'billing-plans' },
    },
    {
        path: 'plans/:planId',
        loadComponent: () => import('../../pages').then(m => m.PlanDetailsComponent),
        data: { animation: 'billing-plan-details' },
    },
    {
        path: 'usage',
        loadComponent: () => import('../../pages').then(m => m.UsageComponent),
        data: { animation: 'billing-usage' },
    },
    {
        path: 'success',
        loadComponent: () => import('../../pages').then(m => m.BillingSuccessComponent),
        data: { animation: 'billing-success' },
    },
    {
        path: 'cancel',
        loadComponent: () => import('../../pages').then(m => m.BillingCancelComponent),
        data: { animation: 'billing-cancel' },
    },
    {
        path: 'passes',
        loadComponent: () => import('../../pages').then(m => m.PassesComponent),
        canActivate: [paywallGuard],
        data: { animation: 'billing-passes' },
    }
];