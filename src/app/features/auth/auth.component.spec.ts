import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthComponent } from './auth.component';

@Component({
  standalone: true,
  template: '',
})
class HomeStubComponent {}

describe('Authentication UI preview', () => {
  const authRoutes = (
    ['login', 'register', 'forgot-password', 'verify-email', 'reset-password'] as const
  ).map((screen) => ({
    path: screen,
    data: { screen },
    component: AuthComponent,
  }));

  async function open(screen: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter([...authRoutes, { path: 'inicio', component: HomeStubComponent }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(`/${screen}`, AuthComponent);
    await harness.fixture.whenStable();
    return { harness, component };
  }

  async function fill(harness: RouterTestingHarness, values: Record<string, string>) {
    for (const [name, value] of Object.entries(values)) {
      const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(
        `input[name="${name}"]`,
      )!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await harness.fixture.whenStable();
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 550));
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('rejects empty login fields without showing success', async () => {
    const { harness, component } = await open('login');
    await fill(harness, {});
    expect(component.done).toBe(false);
    expect(harness.routeNativeElement!.textContent).toContain(
      'Escribe un correo electrónico válido.',
    );
    expect(harness.routeNativeElement!.textContent).toContain('Escribe tu contraseña.');
  });

  it('requires matching passwords and every password rule during registration', async () => {
    const { harness, component } = await open('register');
    await fill(harness, {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'abcdefgh',
      confirmation: 'abcdefgh',
    });
    expect(component.error).toContain('requisitos');
    expect(
      harness.routeNativeElement!.querySelector('#password')!.getAttribute('aria-invalid'),
    ).toBe('true');
    await fill(harness, { password: 'Abcdef12!', confirmation: 'Abcdef13!' });
    expect(component.error).toContain('no coinciden');
    await fill(harness, { confirmation: 'Abcdef12!' });
    expect(TestBed.inject(Router).url).toBe('/verify-email');
    expect(component.password).toBe('');
    expect(harness.routeNativeElement!.textContent).toContain('ana@example.com');
  });

  it('confirms recovery without bypassing the emailed link', async () => {
    const { harness, component } = await open('forgot-password');
    await fill(harness, { email: 'ana@example.com' });
    expect(component.done).toBe(true);
    expect(harness.routeNativeElement!.textContent).toContain('Revisa tu correo');
    expect(harness.routeNativeElement!.querySelector('a.primary')?.getAttribute('href')).toBe(
      '/login',
    );
  });

  it('sends a valid login to the app home', async () => {
    const { harness } = await open('login');
    await fill(harness, { email: 'ana@example.com', password: 'Secret123!' });
    expect(TestBed.inject(Router).url).toBe('/inicio');
  });

  it('clears sensitive fields and success state when navigating between forms', async () => {
    const { harness, component } = await open('reset-password');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.visibility')!.click();
    await fill(harness, { password: 'Secret123!', confirmation: 'Secret123!' });
    expect(component.done).toBe(true);
    expect(component.showPassword).toBe(false);
    const nextComponent = await harness.navigateByUrl('/register', AuthComponent);
    expect(nextComponent.password).toBe('');
    expect(nextComponent.showPassword).toBe(false);
    expect(nextComponent.done).toBe(false);
  });
});

describe('Avisos y cancelación del acceso', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...['login', 'register', 'forgot-password', 'reset-password', 'verify-email'].map(
            (screen) => ({ path: screen, data: { screen }, component: AuthComponent }),
          ),
          { path: 'inicio', component: HomeStubComponent },
        ]),
      ],
    }),
  );
  it.each([
    ['signed-out', 'Cerraste sesión.'],
    ['all-sessions', 'Cerraste todas tus sesiones.'],
    ['expired', 'Tu sesión venció.'],
    ['deleted', 'Tus datos de Bolsillo fueron eliminados de este dispositivo.'],
  ])('presenta aviso %s sin navegación automática', async (exitReason, message) => {
    const harness = await RouterTestingHarness.create();
    await TestBed.inject(Router).navigateByUrl('/login', { state: { exitReason } });
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain(message);
    expect(TestBed.inject(Router).url).toBe('/login');
    await harness.navigateByUrl('/register');
    expect(harness.routeNativeElement!.textContent).not.toContain(message);
  });
  it('abandonar login durante carga limpia contraseñas y cancela navegación pendiente', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/login', AuthComponent);
    for (const [name, value] of Object.entries({
      email: 'ana@example.com',
      password: 'Secret123!',
    })) {
      const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(
        `[name="${name}"]`,
      )!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await harness.fixture.whenStable();
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(component.busy).toBe(true);
    await harness.navigateByUrl('/forgot-password');
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect(TestBed.inject(Router).url).toBe('/forgot-password');
    expect(component.password).toBe('');
  });
});
