import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Budget, Payment, Transaction, localDate } from '../models/finance.models';

export type PaymentReminderResult = 'scheduled' | 'none' | 'denied' | 'unavailable';
const REMINDERS_KEY = 'bolsillo-payment-reminders';
const BUDGET_ALERTS_KEY = 'bolsillo-budget-alerts';
const WEEKLY_SUMMARY_ID = 2_100_000_001;
const INACTIVITY_ID = 2_100_000_002;

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

  async sync(
    payments: Payment[],
    transactions: Transaction[] = [],
    budgets: Budget[] = [],
  ): Promise<void> {
    if (!this.enabled()) return;
    if (!this.available()) return;
    try {
      const permissions = await LocalNotifications.checkPermissions();
      if (permissions.display !== 'granted') return;
      await Promise.all([
        ...payments.map((payment) => this.schedule(payment).catch(() => undefined)),
        this.scheduleWeeklySummary().catch(() => undefined),
        this.scheduleInactivityReminder(transactions).catch(() => undefined),
        this.checkBudgetAlerts(budgets).catch(() => undefined),
      ]);
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

  async enable(
    payments: Payment[],
    transactions: Transaction[] = [],
    budgets: Budget[] = [],
  ): Promise<PaymentReminderResult> {
    this.enabled.set(true);
    localStorage.setItem(REMINDERS_KEY, 'true');
    if (!this.available()) return 'unavailable';
    const granted = await this.ensurePermission();
    if (!granted) {
      this.enabled.set(false);
      localStorage.setItem(REMINDERS_KEY, 'false');
      return 'denied';
    }
    const results = await Promise.all([
      ...payments.map((payment) => this.schedule(payment)),
      this.scheduleWeeklySummary(),
      this.scheduleInactivityReminder(transactions),
      this.checkBudgetAlerts(budgets),
    ]);
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
    await Promise.all([
      ...payments.map((payment) => this.cancel(payment.id)),
      this.cancelByIds([WEEKLY_SUMMARY_ID, INACTIVITY_ID]),
    ]);
  }

  async scheduleInactivityReminder(transactions: Transaction[]): Promise<PaymentReminderResult> {
    if (!this.enabled()) return 'unavailable';
    if (!this.available()) return 'unavailable';
    try {
      await this.cancelByIds([INACTIVITY_ID]);
      const at = this.inactivityDate(transactions);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: INACTIVITY_ID,
            title: '¿Registramos algo?',
            body: 'Han pasado varios días sin movimientos. Agrega tus gastos recientes para mantener tu plan al día.',
            schedule: { at },
            sound: 'default',
            autoCancel: true,
            foreground: true,
            interruptionLevel: 'active' as const,
            isExactNotification: false,
          },
        ],
      });
      return 'scheduled';
    } catch {
      return 'unavailable';
    }
  }

  async checkBudgetAlerts(budgets: Budget[]): Promise<PaymentReminderResult> {
    if (!this.enabled()) return 'unavailable';
    if (!this.available()) return 'unavailable';
    try {
      const permissions = await LocalNotifications.checkPermissions();
      if (permissions.display !== 'granted') return 'denied';
      const sent = this.sentBudgetAlerts();
      const month = localDate().slice(0, 7);
      const notifications = budgets.flatMap((budget) => {
        if (budget.limit <= 0) return [];
        const percent = Math.round((budget.spent / budget.limit) * 100);
        const level = percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : '';
        if (!level) return [];
        const key = `${month}:${budget.name}:${level}`;
        if (sent[key]) return [];
        sent[key] = true;
        return [
          {
            id: this.textNotificationId(`budget:${key}`),
            title: level === 'exceeded' ? 'Presupuesto excedido' : 'Presupuesto cerca del límite',
            body:
              level === 'exceeded'
                ? `${budget.name} ya pasó el límite mensual. Revisa tus movimientos en Bolsillo.`
                : `${budget.name} va por ${percent}% de su presupuesto mensual.`,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            autoCancel: true,
            foreground: true,
            interruptionLevel: 'active' as const,
            isExactNotification: false,
          },
        ];
      });
      this.saveBudgetAlerts(sent);
      if (!notifications.length) return 'none';
      await LocalNotifications.schedule({ notifications });
      return 'scheduled';
    } catch {
      return 'unavailable';
    }
  }

  private async scheduleWeeklySummary(): Promise<PaymentReminderResult> {
    if (!this.enabled()) return 'unavailable';
    if (!this.available()) return 'unavailable';
    try {
      await this.cancelByIds([WEEKLY_SUMMARY_ID]);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: WEEKLY_SUMMARY_ID,
            title: 'Resumen semanal listo',
            body: 'Revisa cómo te fue la semana anterior y ajusta tu plan en Bolsillo.',
            schedule: { at: this.nextMondayMorning(), repeats: true, every: 'week' },
            sound: 'default',
            autoCancel: true,
            foreground: true,
            interruptionLevel: 'active' as const,
            isExactNotification: false,
          },
        ],
      });
      return 'scheduled';
    } catch {
      return 'unavailable';
    }
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

  private textNotificationId(value: string): number {
    let hash = 0;
    for (const char of value) {
      hash = (hash * 31 + char.charCodeAt(0)) % 500_000_000;
    }
    return 1_500_000_000 + hash;
  }

  private async cancelByIds(ids: number[]): Promise<void> {
    if (!this.available()) return;
    try {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    } catch {
      return;
    }
  }

  private nextMondayMorning(): Date {
    const now = new Date();
    const next = new Date(now);
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    next.setDate(now.getDate() + daysUntilMonday);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  private inactivityDate(transactions: Transaction[]): Date {
    const latest = transactions
      .map((transaction) => new Date(`${transaction.date}T12:00:00`).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];
    const base = latest ? new Date(latest) : new Date();
    const reminder = new Date(base);
    reminder.setDate(base.getDate() + 3);
    reminder.setHours(10, 0, 0, 0);
    if (reminder > new Date()) return reminder;
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(10, 0, 0, 0);
    return fallback;
  }

  private sentBudgetAlerts(): Record<string, true> {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(BUDGET_ALERTS_KEY) ?? '{}');
      if (!value || typeof value !== 'object') return {};
      return value as Record<string, true>;
    } catch {
      return {};
    }
  }

  private saveBudgetAlerts(value: Record<string, true>): void {
    localStorage.setItem(BUDGET_ALERTS_KEY, JSON.stringify(value));
  }

  private formatReminderDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
    });
  }
}
