import { Routes } from '@angular/router';
import { LoginComponent } from './presentation/pages/login/login.component.js';
import { RegisterComponent } from './presentation/pages/register/register.component.js';
import { DashboardComponent } from './presentation/pages/dashboard/dashboard.component.js';
import { authGuard } from './presentation/guards/auth.guard.js';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
