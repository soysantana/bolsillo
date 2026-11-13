import { Router, RouterOutlet } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { IonApp, ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { App } from './app';
import { AppRoutingModule } from './app-routing-module';
import { AuthApiService } from './core/services/auth-api.service';

class AuthApiStub {
  isAuthenticated = false;

  authenticated(): boolean {
    return this.isAuthenticated;
  }

  initialize() {
    return of(this.isAuthenticated);
  }
}

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [App],
      imports: [IonApp, RouterOutlet, AppRoutingModule],
      providers: [
        { provide: ModalController, useValue: { create: vi.fn(), dismiss: vi.fn() } },
        { provide: AuthApiService, useClass: AuthApiStub },
      ],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('destroys the previous access screen and its password on navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/login');
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input[name="password"]') as HTMLInputElement;
    input.value = 'Secret123!';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/register');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-auth').length).toBe(1);
    expect(input.isConnected).toBe(false);
    expect(fixture.nativeElement.querySelector('input[name="password"]').value).toBe('');
  });

  it('should render the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('ion-app')).toBeTruthy();
  });

  it('requires policy acceptance before continuing without an account', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/bienvenida');
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.secondary-action').click();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.policy-modal .secondary-action').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Acepta las políticas para continuar sin cuenta.',
    );

    const checkbox = fixture.nativeElement.querySelector(
      'input[name="acceptedPolicies"]',
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.policy-modal .secondary-action').click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/inicio');
    expect(localStorage.getItem('bolsillo-guest-policy-accepted')).toBe('true');
  });

  it('requires login to reopen account data after account access is enabled', async () => {
    localStorage.setItem('bolsillo-account-access', 'true');
    const fixture = TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/inicio');
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('reopens account data when the saved session refreshes successfully', async () => {
    localStorage.setItem('bolsillo-account-access', 'true');
    (TestBed.inject(AuthApiService) as unknown as AuthApiStub).isAuthenticated = true;
    const fixture = TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/inicio');
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/inicio');
  });
});
