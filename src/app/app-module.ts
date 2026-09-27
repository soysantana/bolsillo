import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { IonApp, provideIonicAngular } from '@ionic/angular';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

@NgModule({
  declarations: [App],
  imports: [BrowserModule, IonApp, RouterOutlet, AppRoutingModule],
  providers: [provideBrowserGlobalErrorListeners(), provideIonicAngular({ mode: 'ios' })],
  bootstrap: [App],
})
export class AppModule {}
