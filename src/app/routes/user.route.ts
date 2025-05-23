import { Routes } from '@angular/router';
import { AuthGuard, redirectUnauthorizedTo } from '@angular/fire/auth-guard';



// Define where to redirect unauthorized users
const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['/service/login'])

export const UserRoutes: Routes = [{
    path: '',
    loadComponent: () => import('../layout/full').then(c => c.AppUserLayoutComponent),
    loadChildren: () => import('./user/main.route').then(m => m.MainRoutes),
    canActivate: [AuthGuard],
    data: { authGuardPipe: redirectUnauthorizedToLogin, title: 'user', animation: 'user' }, // Apply the redirection

}]