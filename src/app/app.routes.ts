import { Routes } from '@angular/router';

export const routes: Routes = [

    { path: '', loadComponent: () => import('./pages/main/main.component').then(m => m.MainComponent) },
    { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
    { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
];
