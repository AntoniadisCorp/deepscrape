import { CanDeactivateFn, Routes } from '@angular/router';

const migrationLeaveGuard: CanDeactivateFn<unknown> = (component) => {
  const migrationComponent = component as { requestNavigationLeave?: () => boolean | Promise<boolean> };
  if (typeof migrationComponent.requestNavigationLeave === 'function') {
    return migrationComponent.requestNavigationLeave();
  }

  return true;
};
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
  {
    path: 'migration',
    loadComponent: () => import('../../pages').then(m => m.AdminMigrationComponent),
    canDeactivate: [migrationLeaveGuard],
    data: { title: 'migration', animation: 'admin_migration' },
  },
];
