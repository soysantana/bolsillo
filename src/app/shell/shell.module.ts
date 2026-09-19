import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { SharedModule } from '../shared/shared.module';
import { ShellComponent } from './shell.component';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'inicio',
        loadChildren: () =>
          import('../features/dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        path: 'movimientos',
        loadChildren: () =>
          import('../features/transactions/transactions.module').then((m) => m.TransactionsModule),
      },
      {
        path: 'plan',
        loadChildren: () => import('../features/plan/plan.module').then((m) => m.PlanModule),
      },
      {
        path: 'perfil',
        loadChildren: () =>
          import('../features/profile/profile.module').then((m) => m.ProfileModule),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [ShellComponent],
  imports: [SharedModule, IonContent, RouterModule.forChild(routes)],
})
export class ShellModule {}
