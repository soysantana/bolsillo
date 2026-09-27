import { Component, input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PreviewAction } from '../account-demo';
import { ConfirmationComponent } from '../confirmation/confirmation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
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
  constructor() {
    const scenario = this.flow.configure('logout');
    this.opened.set(scenario.state !== 'initial');
  }
  cancel(): void {
    this.flow.cancel();
    this.opened.set(false);
  }
  confirm(): void {
    this.flow.run(() => {
      this.opened.set(false);
      void this.router.navigateByUrl('/login', { state: { exitReason: 'signed-out' } });
    });
  }
}
