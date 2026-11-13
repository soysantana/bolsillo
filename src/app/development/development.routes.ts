import { Routes } from '@angular/router';
export const DEVELOPMENT_ROUTES: Routes = [
  {
    path: 'dev/notificaciones',
    title: 'Pruebas de Web Push · Bolsillo',
    loadComponent: () =>
      import('./push-notifications-demo.component').then((m) => m.PushNotificationsDemoComponent),
  },
  {
    path: 'dev/cuenta',
    title: 'Demostración de cuenta · Bolsillo',
    loadComponent: () =>
      import('../features/account/account-gallery/account-gallery.component').then(
        (m) => m.AccountGalleryComponent,
      ),
  },
];
