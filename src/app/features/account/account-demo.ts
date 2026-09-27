import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type PreviewState =
  | 'initial'
  | 'loading'
  | 'error'
  | 'success'
  | 'invalid'
  | 'mismatch'
  | 'expired'
  | 'resent'
  | 'empty'
  | 'verified';
export interface PreviewScenario {
  preview?: boolean;
  target: string;
  operation?: 'verify' | 'resend';
  state: PreviewState;
  error?: string;
}
export interface DeviceSession {
  id: string;
  device: string;
  platform: string;
  activity: string;
  current: boolean;
}
export type ExitReason = 'signed-out' | 'all-sessions' | 'expired' | 'deleted';
export const exitMessages: Record<ExitReason, string> = {
  'signed-out': 'Cerraste sesión. Puedes volver cuando quieras.',
  'all-sessions': 'Cerraste todas tus sesiones. Inicia sesión para continuar.',
  expired: 'Tu sesión venció. Inicia sesión para continuar.',
  deleted: 'Tus datos de Bolsillo fueron eliminados de este dispositivo.',
};
const sessionFixtures: DeviceSession[] = [
  {
    id: 'current',
    device: 'iPhone 15',
    platform: 'Safari · iOS',
    activity: 'Activo ahora',
    current: true,
  },
  {
    id: 'laptop',
    device: 'MacBook Air',
    platform: 'Chrome · macOS',
    activity: 'Hoy, 9:41 a. m.',
    current: false,
  },
  {
    id: 'tablet',
    device: 'iPad',
    platform: 'Safari · iPadOS',
    activity: 'Ayer, 6:20 p. m.',
    current: false,
  },
];

/** Ephemeral preview only. Never accepts credentials or accesses financial storage. */
@Injectable({ providedIn: 'root' })
export class AccountDemo {
  readonly identity = signal({ name: 'Ana García', email: 'ana@example.com', verified: false });
  readonly sessions = signal<DeviceSession[]>(sessionFixtures.map((s) => ({ ...s })));
  private scenario: PreviewScenario | undefined;
  select(scenario: PreviewScenario): void {
    this.reset();
    this.scenario = scenario;
  }
  take(target: string): PreviewScenario {
    const scenario = this.scenario;
    this.scenario = undefined;
    return scenario?.target === target
      ? { ...scenario, preview: true }
      : { target, state: 'initial' };
  }
  closeSession(id: string): void {
    this.sessions.update((sessions) => sessions.filter((s) => s.id !== id));
  }
  closeAll(): void {
    this.sessions.set([]);
  }
  reset(): void {
    this.identity.set({ name: 'Ana García', email: 'ana@example.com', verified: false });
    this.sessions.set(sessionFixtures.map((s) => ({ ...s })));
    this.scenario = undefined;
  }
}

/** One instance per view: leaving a view cancels its pending simulation. */
@Injectable()
export class PreviewAction {
  private readonly demo = inject(AccountDemo);
  private timer?: ReturnType<typeof setTimeout>;
  readonly state = signal<PreviewState>('initial');
  readonly error = signal('');
  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }
  configure(target: string): PreviewScenario {
    this.cancel();
    const scenario = this.demo.take(target);
    this.state.set(scenario.state);
    this.error.set(scenario.error ?? '');
    return scenario;
  }
  run(complete: () => void): void {
    if (this.state() === 'loading') return;
    this.error.set('');
    this.state.set('loading');
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.state.set('success');
      complete();
    }, 450);
  }
  cancel(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.state.set('initial');
    this.error.set('');
  }
}
