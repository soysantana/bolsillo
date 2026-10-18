import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { IonApp, provideIonicAngular } from '@ionic/angular';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { authInterceptor } from './core/services/auth.interceptor';

@NgModule({
  declarations: [App],
  imports: [BrowserModule, IonApp, RouterOutlet, AppRoutingModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideIonicAngular({ mode: 'ios' }),
  ],
  bootstrap: [App],
})
export class AppModule {}
