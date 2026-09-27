import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountDemo, PreviewAction, exitMessages, ExitReason } from '../account/account-demo';
import { passwordChecks } from './password-policy';
import { IconComponent } from '../../shared/components/icon/icon.component';

type Screen = 'login' | 'register' | 'forgot-password' | 'verify-email' | 'reset-password';
const routeByScreen: Record<Screen, string> = {
  login: '/login',
  register: '/register',
  'forgot-password': '/forgot-password',
  'verify-email': '/verify-email',
  'reset-password': '/reset-password',
};
const copy: Record<
  Screen,
  { eyebrow: string; title: string; description: string; action: string; icon: string }
> = {
  login: {
    eyebrow: '',
    title: 'Iniciar sesión',
    description: '',
    action: 'Iniciar sesión',
    icon: 'wallet',
  },
  register: {
    eyebrow: '',
    title: 'Crear cuenta',
    description: '',
    action: 'Crear mi cuenta',
    icon: 'invite',
  },
  'forgot-password': {
    eyebrow: '',
    title: 'Recuperar contraseña',
    description: 'Te enviaremos un enlace.',
    action: 'Enviar enlace',
    icon: 'shield',
  },
  'verify-email': {
    eyebrow: '',
    title: 'Verifica tu correo',
    description: '',
    action: 'Continuar',
    icon: 'mail',
  },
  'reset-password': {
    eyebrow: '',
    title: 'Nueva contraseña',
    description: '',
    action: 'Guardar contraseña',
    icon: 'shield',
  },
};

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  providers: [PreviewAction],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly flow = inject(PreviewAction);
  private readonly demo = inject(AccountDemo);
  screen: Screen = 'login';
  notice = '';
  returnTo = '/login';
  showConfirmation = false;
  operation: 'verify' | 'resend' = 'verify';
  name = '';
  email = '';
  password = '';
  confirmation = '';
  showPassword = false;
  submitted = false;
  done = false;
  resent = false;
  error = '';

  constructor() {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    const email = navigationState?.['email'];
    const reason = navigationState?.['exitReason'];
    if (Object.prototype.hasOwnProperty.call(exitMessages, reason))
      this.notice = exitMessages[reason as ExitReason];
    if (navigationState?.['returnTo'] === '/perfil/cuenta') this.returnTo = '/perfil/cuenta';
    this.destroyRef.onDestroy(() => this.clearPasswords());
    if (typeof email === 'string') {
      this.email = email;
    }

    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const screen = data['screen'] ?? 'login';
      if (!Object.prototype.hasOwnProperty.call(copy, screen)) {
        void this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }
      this.screen = screen as Screen;
      this.clearPasswords();
      this.submitted = this.done = this.resent = false;
      const scenario = this.flow.configure(this.screen);
      this.operation = scenario.operation ?? 'verify';
      this.error = scenario.error ?? '';
      this.done = scenario.state === 'success' || scenario.state === 'verified';
      this.resent = scenario.state === 'resent';
      this.submitted = scenario.state === 'invalid' || scenario.state === 'mismatch';
      if (scenario.state === 'mismatch')
        this.error = 'Las contraseñas no coinciden. Revisa e inténtalo de nuevo.';
      if (this.screen === 'login' && scenario.state === 'expired')
        this.notice = exitMessages.expired;
      if (this.screen === 'verify-email' && !this.email) this.email = this.demo.identity().email;
      this.changeDetector.markForCheck();
    });
  }

  get content() {
    return copy[this.screen];
  }
  routeFor(screen: Screen): string {
    return routeByScreen[screen];
  }
  get creatingPassword() {
    return this.screen === 'register' || this.screen === 'reset-password';
  }
  get passwordValid() {
    return this.checks.every((check) => check.valid);
  }
  get progressMessage() {
    if (this.screen === 'verify-email')
      return this.operation === 'resend' ? 'Reenviando correo…' : 'Verificando correo…';
    return {
      login: 'Iniciando sesión…',
      register: 'Creando tu cuenta…',
      'forgot-password': 'Enviando enlace…',
      'reset-password': 'Guardando contraseña…',
    }[this.screen];
  }
  get checks() {
    return passwordChecks(this.password);
  }
  get busy() {
    return this.flow.state() === 'loading';
  }
  get invalidLink() {
    return this.flow.state() === 'expired' && this.screen !== 'login';
  }
  verify(): void {
    if (this.busy) return;
    this.operation = 'verify';
    this.flow.run(() => {
      this.demo.identity.update((identity) => ({ ...identity, verified: true }));
      this.done = true;
      this.changeDetector.markForCheck();
    });
  }
  resend(): void {
    if (this.busy) return;
    this.operation = 'resend';
    this.flow.run(() => {
      this.resent = true;
      this.flow.state.set('resent');
      this.error = '';
      this.changeDetector.markForCheck();
    });
  }
  private clearPasswords(): void {
    this.password = this.confirmation = '';
    this.showPassword = this.showConfirmation = false;
  }

  submit(form: NgForm): void {
    if (this.busy || this.invalidLink) return;
    this.submitted = true;
    this.error = '';
    if (form.invalid) return;
    if (this.screen === 'register' && this.name.trim().length < 2) {
      this.error = 'Escribe un nombre de al menos 2 caracteres.';
      return;
    }
    if (this.creatingPassword && !this.checks.every((check) => check.valid)) {
      this.error = 'Completa los requisitos de tu contraseña.';
      return;
    }
    if (this.creatingPassword && this.password !== this.confirmation) {
      this.error = 'Las contraseñas no coinciden. Revisa e inténtalo de nuevo.';
      return;
    }
    this.flow.run(() => {
      this.clearPasswords();
      if (this.screen === 'login') {
        void this.router.navigateByUrl('/inicio');
      } else if (this.screen === 'register') {
        void this.router.navigateByUrl(routeByScreen['verify-email'], {
          state: { email: this.email },
        });
      } else this.done = true;
      this.changeDetector.markForCheck();
    });
  }
}
