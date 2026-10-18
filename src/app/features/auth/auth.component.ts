import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AccountDemo, PreviewAction, exitMessages, ExitReason } from '../account/account-demo';
import { passwordChecks } from './password-policy';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthApiService } from '../../core/services/auth-api.service';
import { LocalDataLinkService } from '../../core/services/local-data-link.service';
import { authApiMessage } from '../../core/services/api-error-message';

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
  private readonly auth = inject(AuthApiService);
  private readonly localDataLink = inject(LocalDataLinkService);
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
  showLocalDataLink = false;
  localDataLinkRequested = false;
  private token = '';

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
      this.showLocalDataLink = false;
      this.localDataLinkRequested = false;
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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.token = params.get('token') ?? '';
      const email = params.get('email');
      if (email) this.email = email;
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
    if (!this.token) {
      this.error = 'Este enlace no es válido o ya venció. Solicita uno nuevo para continuar.';
      return;
    }
    this.flow.state.set('loading');
    this.flow.error.set('');
    this.auth
      .verifyEmail(this.token)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.changeDetector.markForCheck()),
      )
      .subscribe({
        next: () => {
          this.demo.identity.update((identity) => ({ ...identity, verified: true }));
          this.done = true;
          this.flow.state.set('success');
        },
        error: (error: unknown) => {
          this.flow.state.set('error');
          this.error =
            authApiMessage(error) ??
            'Este enlace no es válido o ya venció. Solicita uno nuevo para continuar.';
        },
      });
  }
  resend(): void {
    if (this.busy) return;
    this.operation = 'resend';
    if (!this.email) {
      this.error = 'Escribe un correo electrónico válido.';
      return;
    }
    this.flow.state.set('loading');
    this.flow.error.set('');
    this.auth
      .resendVerification(this.email)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.changeDetector.markForCheck()),
      )
      .subscribe({
        next: () => {
          this.resent = true;
          this.flow.state.set('resent');
          this.error = '';
        },
        error: (error: unknown) => {
          this.flow.state.set('error');
          this.error = authApiMessage(error) ?? 'La solicitud no se completó. Inténtalo de nuevo.';
        },
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
    this.flow.state.set('loading');
    this.flow.error.set('');
    const request =
      this.screen === 'login'
        ? this.auth.login(this.email, this.password)
        : this.screen === 'register'
          ? this.auth.register(this.name, this.email, this.password)
          : this.screen === 'forgot-password'
            ? this.auth.forgotPassword(this.email)
            : this.auth.resetPassword(this.token, this.password);

    if (this.screen === 'reset-password' && !this.token) {
      this.flow.state.set('error');
      this.error = 'Este enlace no es válido o ya venció. Solicita uno nuevo para continuar.';
      return;
    }

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.changeDetector.markForCheck()),
      )
      .subscribe({
        next: () => {
          this.clearPasswords();
          this.flow.state.set('success');
          if (this.screen === 'login') {
            this.afterAccountAccess();
          } else if (this.screen === 'register') {
            this.prepareLocalDataLink();
            void this.router.navigateByUrl(routeByScreen['verify-email'], {
              state: { email: this.email },
            });
          } else this.done = true;
        },
        error: (error: unknown) => {
          this.flow.state.set('error');
          this.error = this.safeError(error);
        },
      });
  }

  private safeError(error: unknown): string {
    const apiMessage = authApiMessage(error);
    if (apiMessage) return apiMessage;
    if (this.screen === 'login') return this.loginError(error);
    if (this.screen === 'register') return this.registerError(error);
    if (this.screen === 'reset-password')
      return 'Este enlace no es válido o ya venció. Solicita uno nuevo para continuar.';
    return 'La solicitud no se completó. Inténtalo de nuevo.';
  }

  private loginError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.';
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No pudimos verificar tus datos ahora. Inténtalo de nuevo en unos minutos.';
    }
    return 'Algo impidió completar el inicio de sesión. Inténtalo de nuevo.';
  }

  private registerError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No pudimos crear tu cuenta ahora. Inténtalo de nuevo en unos minutos.';
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'Ya hay una cuenta con este correo. Inicia sesión o recupera tu contraseña.';
    }
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'Revisa los datos e inténtalo de nuevo.';
    }
    return 'Algo impidió completar el registro. Inténtalo de nuevo.';
  }

  linkLocalData(): void {
    this.localDataLink.requestLink(this.email);
    this.localDataLinkRequested = true;
    void this.router.navigateByUrl('/inicio');
  }

  continueWithoutLinking(): void {
    void this.router.navigateByUrl('/inicio');
  }

  private afterAccountAccess(): void {
    if (this.localDataLink.hasLocalDataToLink()) {
      this.showLocalDataLink = true;
      return;
    }
    void this.router.navigateByUrl('/inicio');
  }

  private prepareLocalDataLink(): void {
    if (this.localDataLink.hasLocalDataToLink()) {
      this.localDataLink.requestLink(this.email);
      this.localDataLinkRequested = true;
    }
  }
}
