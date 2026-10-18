import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AccountDemo, DeviceSession, PreviewAction } from '../account-demo';
import { accountPaths } from '../account.routes';
import { ConfirmationComponent } from '../confirmation/confirmation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AuthApiService } from '../../../core/services/auth-api.service';
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
  private readonly auth = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    const scenario = this.flow.configure('sessions');
    if (scenario.state === 'empty') this.demo.closeAll();
    if (scenario.state === 'success') {
      this.demo.closeSession('laptop');
      this.notice.set('La sesión se cerró.');
    }
    this.loadSessions();
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
    if (!this.auth.authenticated()) {
      this.flow.run(() => this.flow.state.set('initial'));
      return;
    }
    this.loadSessions();
  }
  confirm(): void {
    const pending = this.pending();
    if (!pending) return;
    if (!this.auth.authenticated()) {
      this.flow.run(() => this.afterSessionClosed(pending));
      return;
    }
    this.flow.state.set('loading');
    this.flow.error.set('');
    const request =
      pending === 'all' ? this.auth.logoutAll() : this.auth.revokeSession(pending.id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.flow.state.set('success');
        this.afterSessionClosed(pending);
      },
      error: () => {
        this.flow.state.set('error');
        this.flow.error.set('No se pudo completar la solicitud. Inténtalo de nuevo.');
      },
    });
  }

  private loadSessions(): void {
    if (!this.auth.authenticated()) return;
    this.flow.state.set('loading');
    this.flow.error.set('');
    this.auth.sessions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (sessions) => {
        this.demo.sessions.set(sessions);
        this.flow.state.set('initial');
      },
      error: () => {
        this.flow.state.set('error');
        this.flow.error.set('No se pudieron cargar las sesiones. Inténtalo de nuevo.');
      },
    });
  }

  private afterSessionClosed(pending: DeviceSession | 'all'): void {
    if (pending === 'all') this.demo.closeAll();
    else this.demo.closeSession(pending.id);
    this.pending.set(null);
    if (pending === 'all' || pending.current) {
      void this.router.navigateByUrl('/login', {
        state: { exitReason: pending === 'all' ? 'all-sessions' : 'signed-out' },
      });
    } else this.notice.set('La sesión se cerró.');
  }
}
