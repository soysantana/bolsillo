import { IconComponent } from './components/icon/icon.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddTransactionSheetComponent } from './components/add-transaction-sheet/add-transaction-sheet.component';
import { CampaignMessageComponent } from './components/campaign-message/campaign-message.component';
import { CategoryIconComponent } from './components/category-icon/category-icon.component';
import { MonthNavigationComponent } from './components/month-navigation/month-navigation.component';
import { IonModal } from '@ionic/angular';

@NgModule({
  declarations: [AddTransactionSheetComponent, CampaignMessageComponent, CategoryIconComponent],
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
    CampaignMessageComponent,
    IconComponent,
    MonthNavigationComponent,
    IonModal,
  ],
})
export class SharedModule {}
