import { TestBed } from '@angular/core/testing';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { App } from './app';
import { AppRoutingModule } from './app-routing-module';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [App],
      imports: [IonApp, IonRouterOutlet, AppRoutingModule],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('ion-app')).toBeTruthy();
  });
});
