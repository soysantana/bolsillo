import { Routes } from '@angular/router';
export const accountPaths = {
  account: '/perfil/cuenta',
  security: '/perfil/seguridad',
  password: '/perfil/seguridad/cambiar-contrasena',
  sessions: '/perfil/seguridad/sesiones',
  delete: '/perfil/seguridad/eliminar-cuenta',
} as const;
export const ACCOUNT_ROUTES: Routes = [
  {
    path: accountPaths.password.slice(1),
    title: 'Cambiar contraseña · Bolsillo',
    data: { screen: 'password' },
    loadComponent: () =>
      import('./security-form/security-form.component').then((m) => m.SecurityFormComponent),
  },
  {
    path: accountPaths.sessions.slice(1),
    title: 'Dispositivos y sesiones · Bolsillo',
    loadComponent: () => import('./sessions/sessions.component').then((m) => m.SessionsComponent),
  },
  {
    path: accountPaths.delete.slice(1),
    title: 'Eliminar cuenta · Bolsillo',
    data: { screen: 'delete' },
    loadComponent: () =>
      import('./security-form/security-form.component').then((m) => m.SecurityFormComponent),
  },
  ...(['account', 'security'] as const).map((screen) => ({
    path: accountPaths[screen].slice(1),
    title: `${screen === 'account' ? 'Mi perfil' : 'Seguridad'} · Bolsillo`,
    data: { screen },
    loadComponent: () =>
      import('./account-overview/account-overview.component').then(
        (m) => m.AccountOverviewComponent,
      ),
  })),
];
