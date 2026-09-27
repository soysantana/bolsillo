import { Router, RouterOutlet } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { IonApp } from '@ionic/angular';
import { App } from './app';
import { AppRoutingModule } from './app-routing-module';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [App],
      imports: [IonApp, RouterOutlet, AppRoutingModule],
    }).compileComponents();
  });

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
});
