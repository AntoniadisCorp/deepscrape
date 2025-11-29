import { Routes } from '@angular/router';
export const AdminRoutes: Routes = [
  {
    path: '',
    // loadComponent: () => import('../../pages').then(m => m.PassesComponent),
    // canActivate: [LoginGuard],
    redirectTo: 'analytics',
    pathMatch: 'full'
  },
  {
    path: 'analytics',
    loadComponent: () => import('../../pages').then(m => m.AdminAnalyticsComponent),
    data: { title: 'analytics', animation: 'admin_analytics' },
  },
];
