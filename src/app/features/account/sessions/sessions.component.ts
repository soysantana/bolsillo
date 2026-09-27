import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccountDemo, DeviceSession, PreviewAction } from '../account-demo';
import { accountPaths } from '../account.routes';
import { ConfirmationComponent } from '../confirmation/confirmation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({
  selector: 'app-sessions',
  imports: [RouterLink, ConfirmationComponent, IconComponent],
  providers: [PreviewAction],
  templateUrl: './sessions.component.html',
  styleUrl: '../account.scss',
})
export class SessionsComponent {
  readonly demo = inject(AccountDemo);
  readonly flow = inject(PreviewAction);
  readonly paths = accountPaths;
  readonly pending = signal<DeviceSession | 'all' | null>(null);
  readonly notice = signal('');
  private readonly router = inject(Router);
  constructor() {
    const scenario = this.flow.configure('sessions');
    if (scenario.state === 'empty') this.demo.closeAll();
    if (scenario.state === 'success') {
      this.demo.closeSession('laptop');
      this.notice.set('La sesión se cerró.');
    }
  }
  get description(): string {
    const pending = this.pending();
    return pending === 'all'
      ? 'Se cerrará el acceso en todos tus dispositivos, incluido este.'
      : pending?.current
        ? 'Se cerrará el acceso en este dispositivo y volverás a iniciar sesión.'
        : `Se cerrará el acceso en ${pending?.device ?? 'ese dispositivo'}. Tu sesión actual seguirá abierta.`;
  }
  cancel(): void {
    this.flow.cancel();
    this.pending.set(null);
  }
  retry(): void {
    this.flow.run(() => this.flow.state.set('initial'));
  }
  confirm(): void {
    const pending = this.pending();
    if (!pending) return;
    this.flow.run(() => {
      if (pending === 'all') this.demo.closeAll();
      else this.demo.closeSession(pending.id);
      this.pending.set(null);
      if (pending === 'all' || pending.current) {
        void this.router.navigateByUrl('/login', {
          state: { exitReason: pending === 'all' ? 'all-sessions' : 'signed-out' },
        });
      } else this.notice.set('La sesión se cerró.');
    });
  }
}
