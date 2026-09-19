import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonApp, IonRouterOutlet, provideIonicAngular } from '@ionic/angular';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

@NgModule({
  declarations: [App],
  imports: [BrowserModule, IonApp, IonRouterOutlet, AppRoutingModule],
  providers: [provideBrowserGlobalErrorListeners(), provideIonicAngular({ mode: 'ios' })],
  bootstrap: [App],
})
export class AppModule {}
