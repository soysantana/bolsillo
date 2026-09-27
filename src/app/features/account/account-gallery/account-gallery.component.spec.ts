import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { scenarioGroups } from './scenarios';
import { AccountDemo } from '../account-demo';
import { ACCOUNT_ROUTES } from '../account.routes';
import { AuthComponent } from '../../auth/auth.component';
import { LogoutComponent } from '../logout/logout.component';
import { DEVELOPMENT_ROUTES } from '../../../development/development.routes.production';
@Component({ imports: [LogoutComponent], template: '<app-logout />' })
class ProfileStub {}

describe('Galería de desarrollo', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  });
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...ACCOUNT_ROUTES,
          ...['login', 'register', 'forgot-password', 'reset-password', 'verify-email'].map(
            (screen) => ({ path: screen, data: { screen }, component: AuthComponent }),
          ),
          { path: 'perfil', component: ProfileStub },
        ]),
      ],
    }),
  );
  it('no registra ninguna ruta de desarrollo en producción', () =>
    expect(DEVELOPMENT_ROUTES).toEqual([]));
  for (const group of scenarioGroups) {
    for (const scenario of group.scenarios) {
      it(`${group.title}: ${scenario.label} se puede revisar sin solicitudes`, async () => {
        TestBed.inject(AccountDemo).select(scenario);
        const harness = await RouterTestingHarness.create(group.path);
        const text = harness.routeNativeElement!.textContent!;
        expect(text.trim().length).toBeGreaterThan(20);
        if (scenario.error) expect(text).toContain(scenario.error);
        if (scenario.state === 'loading')
          expect(harness.routeNativeElement!.querySelector('[role="status"]')).not.toBeNull();
        if (scenario.state === 'expired') expect(text).toMatch(/venció/);
      });
    }
  }
});

describe('Fidelidad de escenarios', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...ACCOUNT_ROUTES,
          { path: 'verify-email', data: { screen: 'verify-email' }, component: AuthComponent },
        ]),
      ],
    }),
  );
  it('sesión cerrada retira solo un dispositivo ajeno', async () => {
    const demo = TestBed.inject(AccountDemo);
    demo.select({ target: 'sessions', state: 'success' });
    await RouterTestingHarness.create('/perfil/seguridad/sesiones');
    expect(demo.sessions().map((session) => session.id)).toEqual(['current', 'tablet']);
  });
  it.each(['Verificando', 'Reenviando'])('anuncia específicamente %s correo', async (label) => {
    const scenario = scenarioGroups
      .find((group) => group.title === 'Verificar correo')!
      .scenarios.find((scenario) => scenario.label === label)!;
    TestBed.inject(AccountDemo).select(scenario);
    const harness = await RouterTestingHarness.create('/verify-email');
    expect(harness.routeNativeElement!.textContent).toContain(`${label} correo…`);
  });
});
