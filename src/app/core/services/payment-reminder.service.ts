import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Payment } from '../models/finance.models';

export type PaymentReminderResult = 'scheduled' | 'none' | 'denied' | 'unavailable';
const REMINDERS_KEY = 'bolsillo-payment-reminders';

@Injectable({ providedIn: 'root' })
export class PaymentReminderService {
  readonly enabled = signal(localStorage.getItem(REMINDERS_KEY) === 'true');
  private readonly reminderHours = [
    { offsetDays: -1, hour: 18, label: 'mañana' },
    { offsetDays: 0, hour: 9, label: 'hoy' },
  ];

  async schedule(payment: Payment): Promise<PaymentReminderResult> {
    if (!this.enabled()) return 'unavailable';
    if (!this.available()) return 'unavailable';
    try {
      const granted = await this.ensurePermission();
      if (!granted) return 'denied';
      await this.cancel(payment.id);
      const notifications = this.reminderDates(payment.date).map((date, index) => ({
        id: this.notificationId(payment.id, index),
        title: `Pago pendiente ${this.reminderHours[index].label}`,
        body: `${payment.name} vence ${this.formatReminderDate(payment.date)}. Revisa Bolsillo para pagarlo a tiempo.`,
        schedule: { at: date },
        sound: 'default',
        autoCancel: true,
        foreground: true,
        interruptionLevel: 'active' as const,
        isExactNotification: false,
        extra: { paymentId: payment.id },
      }));
      if (!notifications.length) return 'none';
      await LocalNotifications.schedule({ notifications });
      return 'scheduled';
    } catch {
      return 'unavailable';
    }
  }

  async sync(payments: Payment[]): Promise<void> {
    if (!this.enabled()) return;
    if (!this.available()) return;
    try {
      const permissions = await LocalNotifications.checkPermissions();
      if (permissions.display !== 'granted') return;
      await Promise.all(payments.map((payment) => this.schedule(payment).catch(() => undefined)));
    } catch {
      return;
    }
  }

  async cancel(paymentId: number): Promise<void> {
    if (!this.available()) return;
    try {
      await LocalNotifications.cancel({
        notifications: [this.notificationId(paymentId, 0), this.notificationId(paymentId, 1)].map(
          (id) => ({ id }),
        ),
      });
    } catch {
      return;
    }
  }

  async enable(payments: Payment[]): Promise<PaymentReminderResult> {
    this.enabled.set(true);
    localStorage.setItem(REMINDERS_KEY, 'true');
    if (!payments.length) return 'none';
    const results = await Promise.all(payments.map((payment) => this.schedule(payment)));
    if (results.includes('scheduled')) return 'scheduled';
    if (results.includes('denied')) {
      this.enabled.set(false);
      localStorage.setItem(REMINDERS_KEY, 'false');
      return 'denied';
    }
    return results[0] ?? 'none';
  }

  async disable(payments: Payment[]): Promise<void> {
    this.enabled.set(false);
    localStorage.setItem(REMINDERS_KEY, 'false');
    await Promise.all(payments.map((payment) => this.cancel(payment.id)));
  }

  private available(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
  }

  private async ensurePermission(): Promise<boolean> {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  }

  private reminderDates(date: string): Date[] {
    const [year, month, day] = date.split('-').map(Number);
    const now = new Date();
    return this.reminderHours
      .map(({ offsetDays, hour }) => new Date(year, month - 1, day + offsetDays, hour, 0, 0, 0))
      .filter((reminderDate) => reminderDate > now);
  }

  private notificationId(paymentId: number, reminderIndex: number): number {
    let hash = 0;
    for (const char of String(paymentId)) {
      hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000_000;
    }
    return hash * 2 + reminderIndex;
  }

  private formatReminderDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
    });
  }
}
