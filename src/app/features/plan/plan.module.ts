import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PlanComponent } from './plan.component';

const routes: Routes = [{ path: '', component: PlanComponent }];

@NgModule({
  declarations: [PlanComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class PlanModule {}
