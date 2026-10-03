import { DEVELOPMENT_ROUTES } from './development/development.routes';
import { ACCOUNT_ROUTES } from './features/account/account.routes';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  ...DEVELOPMENT_ROUTES,
  ...ACCOUNT_ROUTES,
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  ...(['login', 'register', 'forgot-password', 'verify-email', 'reset-password'] as const).map(
    (screen) => ({
      path: screen,
      data: { screen },
      loadComponent: () => import('./features/auth/auth.component').then((m) => m.AuthComponent),
    }),
  ),
  {
    path: '',
    loadChildren: () => import('./shell/shell.module').then((m) => m.ShellModule),
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
