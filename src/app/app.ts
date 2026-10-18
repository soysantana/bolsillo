import { Component } from '@angular/core';
import { AuthApiService } from './core/services/auth-api.service';
import { MobileViewportService } from './core/services/mobile-viewport.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  constructor(
    private readonly viewport: MobileViewportService,
    private readonly auth: AuthApiService,
  ) {
    this.auth.initialize().subscribe();
  }
}
