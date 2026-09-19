import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TransactionsComponent } from './transactions.component';
import { IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList } from '@ionic/angular';

const routes: Routes = [{ path: '', component: TransactionsComponent }];

@NgModule({
  declarations: [TransactionsComponent],
  imports: [
    SharedModule,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonList,
    RouterModule.forChild(routes),
  ],
})
export class TransactionsModule {}
