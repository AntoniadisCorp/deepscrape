import { Routes } from '@angular/router';
import { AdminGuard } from '../core/guards/admin.guard';
import { AdminAnalyticsComponent } from '../pages';

export const AdminRoutes: Routes = [
  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
      {
        path: 'analytics',
        component: AdminAnalyticsComponent
      }
    ]
  }
];
