import { Component, input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PreviewAction } from '../account-demo';
import { ConfirmationComponent } from '../confirmation/confirmation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AuthApiService } from '../../../core/services/auth-api.service';
@Component({
  selector: 'app-logout',
  imports: [ConfirmationComponent, IconComponent],
  providers: [PreviewAction],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss',
})
export class LogoutComponent {
  readonly variant = input<'row' | 'icon'>('row');
  readonly flow = inject(PreviewAction);
  readonly opened = signal(false);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthApiService);
  constructor() {
    const scenario = this.flow.configure('logout');
    this.opened.set(scenario.state !== 'initial');
  }
  cancel(): void {
    this.flow.cancel();
    this.opened.set(false);
  }
  confirm(): void {
    this.flow.state.set('loading');
    this.flow.error.set('');
    this.auth
      .logout()
      .pipe(finalize(() => this.opened.set(false)))
      .subscribe(() => {
        this.flow.state.set('success');
        void this.router.navigateByUrl('/login', { state: { exitReason: 'signed-out' } });
      });
  }
}
