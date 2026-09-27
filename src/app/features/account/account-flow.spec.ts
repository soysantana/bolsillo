import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { Component } from '@angular/core';
import { ACCOUNT_ROUTES, accountPaths } from './account.routes';
import { AccountDemo } from './account-demo';
import { SecurityFormComponent } from './security-form/security-form.component';
import { FinanceStore } from '../../core/services/finance-store.service';
import { PaymentReminderService } from '../../core/services/payment-reminder.service';

// jsdom lacks native dialog behavior; browser review covers focus confinement.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

@Component({ template: '<h1>Login</h1>' })
class LoginStub {}

describe('Cuenta: navegación y datos aislados', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...ACCOUNT_ROUTES,
          { path: 'login', component: LoginStub },
          { path: 'perfil', component: LoginStub },
        ]),
      ],
    }),
  );

  it('muestra identidad ficticia y regreso a Perfil', async () => {
    const harness = await RouterTestingHarness.create(accountPaths.account);
    expect(harness.routeNativeElement!.textContent).toContain('ana@example.com');
    expect(harness.routeNativeElement!.querySelector('a')!.getAttribute('href')).toBe('/perfil');
  });

  it('ofrece contraseña y sesiones, sin eliminación en Seguridad', async () => {
    const harness = await RouterTestingHarness.create(accountPaths.security);
    const links = [...harness.routeNativeElement!.querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(expect.arrayContaining([accountPaths.password, accountPaths.sessions]));
    expect(links).not.toContain(accountPaths.delete);
  });

  it('cancelar cierre conserva sesiones y confirmar solo elimina la seleccionada', async () => {
    const harness = await RouterTestingHarness.create(accountPaths.sessions);
    const demo = TestBed.inject(AccountDemo);
    const original = JSON.stringify(localStorage);
    const button =
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-session="laptop"]')!;
    button.click();
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('dialog .cancel')!.click();
    await harness.fixture.whenStable();
    expect(demo.sessions().length).toBe(3);
    button.click();
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('dialog .confirm')!.click();
    await new Promise((resolve) => setTimeout(resolve, 550));
    await harness.fixture.whenStable();
    expect(demo.sessions().map((s) => s.id)).toEqual(['current', 'tablet']);
    expect(JSON.stringify(localStorage)).toBe(original);
    expect(TestBed.inject(Router).url).toBe(accountPaths.sessions);
  });
});

describe('Formularios de seguridad', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([...ACCOUNT_ROUTES, { path: 'login', component: LoginStub }])],
    }),
  );
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
    await harness.fixture.whenStable();
  }
  it('valida contraseña actual, requisitos y coincidencia; bloquea doble envío', async () => {
    const harness = await RouterTestingHarness.create(accountPaths.password);
    await fill(harness, {});
    expect(harness.routeNativeElement!.textContent).toContain('Escribe tu contraseña actual.');
    await fill(harness, { current: 'Actual123!', password: 'abcdefgh', confirmation: 'abcdefgh' });
    expect(harness.routeNativeElement!.textContent).toContain('Completa los requisitos');
    await fill(harness, { password: 'Nueva123!', confirmation: 'Distinta123!' });
    expect(harness.routeNativeElement!.textContent).toContain('no coinciden');
    await fill(harness, { confirmation: 'Nueva123!' });
    expect(
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled,
    ).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('Contraseña actualizada');
    expect(harness.routeNativeElement!.querySelector('input')).toBeNull();
  });
  it('la demostración conserva almacenamiento al cancelar y completar', async () => {
    const snapshot = JSON.stringify(localStorage);
    TestBed.inject(AccountDemo).select({ target: 'delete', state: 'initial' });
    const harness = await RouterTestingHarness.create(accountPaths.delete);
    await fill(harness, {});
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('dialog .cancel')!.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('dialog')).toBeNull();
    expect(JSON.stringify(localStorage)).toBe(snapshot);
    await fill(harness, {});
    const password =
      harness.routeNativeElement!.querySelector<HTMLInputElement>('#deletion-password')!;
    password.value = 'Actual123!';
    password.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('dialog .confirm')!.click();
    await new Promise((resolve) => setTimeout(resolve, 550));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('Datos eliminados');
    expect(JSON.stringify(localStorage)).toBe(snapshot);
  });
});

describe('Recorridos completos y aislamiento', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([...ACCOUNT_ROUTES, { path: 'login', component: LoginStub }])],
    }),
  );
  it.each(['current', 'all'])(
    'cerrar %s lleva al login y conserva todos los datos locales',
    async (id) => {
      localStorage.setItem(
        'account-test-finances',
        JSON.stringify({ transactions: [12], goals: [4], preferences: { hide: true } }),
      );
      const before = JSON.stringify(localStorage);
      const harness = await RouterTestingHarness.create(accountPaths.sessions);
      const selector = id === 'all' ? '[data-close-all]' : '[data-session="current"]';
      harness.routeNativeElement!.querySelector<HTMLButtonElement>(selector)!.click();
      await harness.fixture.whenStable();
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('dialog .confirm')!.click();
      await new Promise((resolve) => setTimeout(resolve, 550));
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/login');
      expect(JSON.stringify(localStorage)).toBe(before);
      localStorage.removeItem('account-test-finances');
    },
  );
  it('salir durante una operación cancela el cierre pendiente', async () => {
    const harness = await RouterTestingHarness.create(accountPaths.sessions);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-close-all]')!.click();
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('dialog .confirm')!.click();
    await harness.navigateByUrl(accountPaths.security);
    await new Promise((resolve) => setTimeout(resolve, 550));
    await harness.fixture.whenStable();
    expect(TestBed.inject(AccountDemo).sessions()).toHaveLength(3);
    expect(TestBed.inject(Router).url).toBe(accountPaths.security);
  });
  it('reiniciar restaura identidad y sesiones sin persistencia ni solicitudes', () => {
    const demo = TestBed.inject(AccountDemo);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const fetch = vi.spyOn(globalThis, 'fetch');
    demo.closeAll();
    demo.identity.update((identity) => ({ ...identity, verified: true }));
    demo.reset();
    expect(demo.sessions()).toHaveLength(3);
    expect(demo.identity().verified).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    write.mockRestore();
    fetch.mockRestore();
  });
});

describe('Reintentos y cancelación de eliminación', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(ACCOUNT_ROUTES)] }));
  it('el modal permite cancelar sin borrar datos', async () => {
    const store = TestBed.inject(FinanceStore);
    store.updateName('Nombre privado');
    const original = store.backup();
    const fixture = TestBed.createComponent(SecurityFormComponent);
    fixture.componentRef.setInput('sheet', true);
    await fixture.whenStable();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    expect(fixture.nativeElement.textContent).toContain('Eliminar cuenta');
    expect(fixture.nativeElement.querySelector('input[name="password"]')).toBeNull();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('dialog')).not.toBeNull();
    fixture.nativeElement.querySelector('dialog .confirm').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Escribe tu contraseña para confirmar');
    expect(store.backup()).toBe(original);
    const password = fixture.nativeElement.querySelector('#deletion-password') as HTMLInputElement;
    password.value = 'Actual123!';
    password.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('dialog .cancel').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.current).toBe('');
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Cancelar')!.click();
    expect(closed).toHaveBeenCalledOnce();
    expect(store.backup()).toBe(original);
    fixture.destroy();
    expect(fixture.componentInstance.current).toBe('');
  });
  it('borra datos actuales y antiguos sin afectar otras claves ni reaparecer al cargar', async () => {
    const store = TestBed.inject(FinanceStore);
    store.updateName('Nombre privado');
    store.saveAccount('Mi cuenta', 200);
    store.addGoal('Meta privada', 100);
    localStorage.setItem('bolsillo-transactions', '[]');
    localStorage.setItem('bolsillo-budgets', '[]');
    localStorage.setItem('bolsillo-payment-reminders', 'true');
    localStorage.setItem('bolsillo-budget-alerts', '{"privado":true}');
    localStorage.setItem('unrelated', 'keep');
    const fixture = TestBed.createComponent(SecurityFormComponent);
    fixture.componentRef.setInput('sheet', true);
    await fixture.whenStable();
    fixture.componentInstance.confirming.set(true);
    fixture.componentInstance.current = 'Actual123!';
    await fixture.componentInstance.save();
    expect(fixture.componentInstance.flow.state()).toBe('success');
    for (const key of [
      'bolsillo-v2',
      'bolsillo-transactions',
      'bolsillo-budgets',
      'bolsillo-payment-reminders',
      'bolsillo-budget-alerts',
    ]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(store.name()).toBe('Mi perfil');
    expect(store.totalBalance()).toBe(0);
    expect(store.goals()).toEqual([]);
    expect(new FinanceStore().backup()).toBe(store.backup());
    expect(localStorage.getItem('unrelated')).toBe('keep');
    localStorage.removeItem('unrelated');
  });
  it('un fallo de limpieza no muestra éxito y permite reintentar', async () => {
    const store = TestBed.inject(FinanceStore);
    store.updateName('Conservar hasta reintentar');
    const cleanup = vi
      .spyOn(TestBed.inject(PaymentReminderService), 'deleteLocalData')
      .mockRejectedValueOnce(new Error('notification failure'))
      .mockResolvedValue(undefined);
    const fixture = TestBed.createComponent(SecurityFormComponent);
    fixture.componentRef.setInput('sheet', true);
    await fixture.whenStable();
    fixture.componentInstance.confirming.set(true);
    fixture.componentInstance.current = 'Actual123!';
    await fixture.componentInstance.save();
    expect(fixture.componentInstance.flow.state()).toBe('error');
    expect(store.name()).toBe('Conservar hasta reintentar');
    await fixture.componentInstance.save();
    expect(fixture.componentInstance.flow.state()).toBe('success');
    expect(cleanup).toHaveBeenCalledTimes(2);
    cleanup.mockRestore();
  });
  it('error de carga permite recuperar sesiones', async () => {
    TestBed.inject(AccountDemo).select({
      target: 'sessions',
      state: 'error',
      error: 'No pudimos cargar tus sesiones.',
    });
    const harness = await RouterTestingHarness.create(accountPaths.sessions);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('Cargando sesiones');
    await new Promise((resolve) => setTimeout(resolve, 550));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('MacBook Air');
  });
  it('salir del formulario limpia contraseña actual y nueva', async () => {
    const { SecurityFormComponent } = await import('./security-form/security-form.component');
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(accountPaths.password, SecurityFormComponent);
    component.current = 'Actual123!';
    component.password = 'Nueva123!';
    component.confirmation = 'Nueva123!';
    await harness.navigateByUrl(accountPaths.security);
    expect(component.current).toBe('');
    expect(component.password).toBe('');
    expect(component.confirmation).toBe('');
  });
});
