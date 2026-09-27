import { LogoutComponent } from '../account/logout/logout.component';
import { SecurityFormComponent } from '../account/security-form/security-form.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ProfileComponent } from './profile.component';

const routes: Routes = [{ path: '', component: ProfileComponent }];

@NgModule({
  declarations: [ProfileComponent],
  imports: [LogoutComponent, SecurityFormComponent, SharedModule, RouterModule.forChild(routes)],
})
export class ProfileModule {}
