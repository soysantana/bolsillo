import { IconComponent } from './components/icon/icon.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddTransactionSheetComponent } from './components/add-transaction-sheet/add-transaction-sheet.component';
import { CategoryIconComponent } from './components/category-icon/category-icon.component';
import { MonthNavigationComponent } from './components/month-navigation/month-navigation.component';
import { IonModal } from '@ionic/angular';

@NgModule({
  declarations: [AddTransactionSheetComponent, CategoryIconComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
    MonthNavigationComponent,
    IonModal,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CategoryIconComponent,
    IconComponent,
    MonthNavigationComponent,
    IonModal,
  ],
})
export class SharedModule {}
