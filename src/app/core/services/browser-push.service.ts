import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payment } from '../models/finance.models';

type BrowserPermission = NotificationPermission | 'unavailable';
type PublicKeyResponse = { publicKey: string | null };
export type BrowserNotification = { id: string; title: string; body: string; readAt: string | null; createdAt: string };

const ANONYMOUS_ID_KEY = 'bolsillo.push-anonymous-id';
const ENABLED_KEY = 'bolsillo-browser-push-enabled';

@Injectable({ providedIn: 'root' })
export class BrowserPushService {
  private readonly http = inject(HttpClient);
  readonly permission = signal<BrowserPermission>(this.readPermission());
  readonly enabled = signal(localStorage.getItem(ENABLED_KEY) === 'true');
  readonly supported = signal(this.isSupported());
  readonly blocked = signal(this.permission() === 'denied');
  readonly notifications = signal<BrowserNotification[]>([]);
  private subscription?: PushSubscription;

  async initialize(payments: Payment[]): Promise<void> {
    if (!this.supported() || this.permission() !== 'granted') return;
    try {
      await this.registerSubscription();
      await this.syncReminders(payments);
    } catch {
      this.enabled.set(false);
    }
  }

  async initializeOnOpen(payments: Payment[]): Promise<void> {
    if (!this.supported()) return;
    if (this.permission() === 'default') {
      await this.enable(payments);
      return;
    }
    await this.initialize(payments);
    await this.refreshNotifications();
  }

  async enable(payments: Payment[]): Promise<'enabled' | 'denied' | 'unavailable'> {
    if (!this.supported()) return 'unavailable';
    const permission = await Notification.requestPermission();
    this.permission.set(permission);
    this.blocked.set(permission === 'denied');
    if (permission !== 'granted') return 'denied';
    try {
      await this.registerSubscription();
      await this.syncReminders(payments);
      this.enabled.set(true);
      localStorage.setItem(ENABLED_KEY, 'true');
      return 'enabled';
    } catch {
      return 'unavailable';
    }
  }

  async disable(): Promise<void> {
    try {
      const subscription = this.subscription ?? (await (await this.registration()).pushManager.getSubscription());
      if (subscription) {
        await firstValueFrom(this.http.delete(`${environment.apiUrl}/notifications/subscriptions`, { body: { endpoint: subscription.endpoint } }));
        await subscription.unsubscribe();
      }
    } catch {
      // Local state is still cleared when the browser or API is unavailable.
    }
    this.subscription = undefined;
    this.enabled.set(false);
    localStorage.setItem(ENABLED_KEY, 'false');
  }

  async unregister(): Promise<void> {
    await this.disable();
  }

  async refreshNotifications(): Promise<void> {
    try {
      const anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY) ?? undefined;
      const query = anonymousId ? `?anonymousId=${encodeURIComponent(anonymousId)}` : '';
      this.notifications.set(await firstValueFrom(this.http.get<BrowserNotification[]>(`${environment.apiUrl}/notifications${query}`)));
    } catch {
      this.notifications.set([]);
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    const anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
    await firstValueFrom(this.http.patch(`${environment.apiUrl}/notifications/${encodeURIComponent(id)}/read`, {}, { params: anonymousId ? { anonymousId } : {} }));
    this.notifications.update((items) => items.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
  }

  private async registerSubscription(): Promise<void> {
    const registration = await this.registration();
    const response = await firstValueFrom(this.http.get<PublicKeyResponse>(`${environment.apiUrl}/notifications/public-key`));
    if (!response.publicKey) throw new Error('Web Push is not configured');
    this.subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64(response.publicKey).buffer as ArrayBuffer });
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/subscriptions`, {
      endpoint: this.subscription.endpoint,
      keys: { p256dh: toBase64(this.subscription.getKey('p256dh')), auth: toBase64(this.subscription.getKey('auth')) },
      anonymousId: this.anonymousId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: navigator.userAgent,
    }));
  }

  async syncReminders(payments: Payment[]): Promise<void> {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/reminders/sync`, {
      anonymousId: this.anonymousId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reminders: payments.map((payment) => ({ localId: String(payment.id), title: payment.name, dueDate: payment.date, completed: false })),
    }));
  }

  async sendTest(): Promise<void> {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/test`, {
      anonymousId: localStorage.getItem(ANONYMOUS_ID_KEY),
    }));
  }

  private async registration(): Promise<ServiceWorkerRegistration> {
    return navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  }

  private anonymousId(): string {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    localStorage.setItem(ANONYMOUS_ID_KEY, created);
    return created;
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  private readPermission(): BrowserPermission {
    return this.isSupported() ? Notification.permission : 'unavailable';
  }
}

function decodeBase64(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(`${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function toBase64(value: ArrayBuffer | null): string {
  if (!value) throw new Error('Push key missing');
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
