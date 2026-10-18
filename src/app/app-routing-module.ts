import { DEVELOPMENT_ROUTES } from './development/development.routes';
import { ACCOUNT_ROUTES } from './features/account/account.routes';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { appAccessGuard } from './core/guards/app-access.guard';
import { authPageGuard } from './core/guards/auth-page.guard';

const routes: Routes = [
  ...DEVELOPMENT_ROUTES,
  ...ACCOUNT_ROUTES,
  { path: '', pathMatch: 'full', redirectTo: 'bienvenida' },
  {
    path: 'bienvenida',
    title: 'Bienvenida · Bolsillo',
    loadComponent: () =>
      import('./features/welcome/welcome.component').then((m) => m.WelcomeComponent),
  },
  ...(['login', 'register', 'forgot-password', 'verify-email', 'reset-password'] as const).map(
    (screen) => ({
      path: screen,
      canActivate: [authPageGuard],
      data: { screen },
      loadComponent: () => import('./features/auth/auth.component').then((m) => m.AuthComponent),
    }),
  ),
  {
    path: '',
    canActivate: [appAccessGuard],
    loadChildren: () => import('./shell/shell.module').then((m) => m.ShellModule),
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
