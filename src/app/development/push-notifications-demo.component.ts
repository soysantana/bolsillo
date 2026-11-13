import { Component, inject } from '@angular/core';
import { BrowserPushService } from '../core/services/browser-push.service';
import { Payment } from '../core/models/finance.models';

@Component({
  selector: 'app-push-notifications-demo',
  standalone: true,
  template: `
    <main class="dev-page">
      <a class="back-link" href="/inicio">← Volver a Bolsillo</a>
      <span class="eyebrow">Development</span>
      <h1>Pruebas de Web Push</h1>
      <p class="intro">Usa esta pantalla para validar permisos, suscripciones, sincronización y entrega.</p>

      <section class="status-card">
        <div><span>Soporte del navegador</span><strong>{{ push.supported() ? 'Disponible' : 'No disponible' }}</strong></div>
        <div><span>Permiso</span><strong>{{ push.permission() }}</strong></div>
        <div><span>Estado</span><strong>{{ push.enabled() ? 'Activo' : 'Inactivo' }}</strong></div>
        <div><span>Notificaciones internas</span><strong>{{ push.notifications().length }}</strong></div>
      </section>

      <section class="actions-card">
        <h2>Acciones</h2>
        <button type="button" (click)="enable()">Activar Web Push</button>
        <button type="button" (click)="sendTest()">Enviar notificación de prueba</button>
        <button type="button" (click)="syncReminder()">Sincronizar recordatorio de prueba</button>
        <button type="button" class="muted" (click)="disable()">Desactivar Web Push</button>
      </section>

      @if (message) { <p class="message" role="status">{{ message }}</p> }

      <section class="notifications-card">
        <div class="section-heading"><h2>Centro interno</h2><button type="button" (click)="refresh()">Actualizar</button></div>
        @if (!push.notifications().length) { <p>Aún no hay notificaciones guardadas.</p> }
        @for (notification of push.notifications(); track notification.id) {
          <article [class.unread]="!notification.readAt">
            <strong>{{ notification.title }}</strong>
            <p>{{ notification.body }}</p>
            <button type="button" (click)="read(notification.id)">Marcar como leída</button>
          </article>
        }
      </section>
    </main>
  `,
  styles: `
    :host { display:block; height:100dvh; min-height:100%; overflow-y:auto; background:#f4f7ef; color:#20251f; }
    .dev-page { display:grid; gap:18px; min-height:100%; max-width:620px; margin:auto; padding:32px 20px 60px; }
    .back-link { color:#596451; text-decoration:none; font-weight:700; }
    .eyebrow { color:#65705f; font-size:12px; font-weight:800; text-transform:uppercase; }
    h1,h2,p { margin:0; } h1 { font-size:clamp(34px,9vw,54px); line-height:.95; } h2 { font-size:20px; }
    .intro { color:#65705f; line-height:1.5; }
    .status-card,.actions-card,.notifications-card { display:grid; gap:12px; background:#fff; border:1px solid #d7ded0; border-radius:20px; padding:18px; }
    .status-card div { display:flex; justify-content:space-between; gap:16px; } .status-card span { color:#65705f; }
    button { border:0; border-radius:12px; background:#20251f; color:#fff; cursor:pointer; font:inherit; font-weight:750; padding:13px 15px; }
    button.muted,.notifications-card article button { background:#e8eee1; color:#20251f; }
    .message { color:#4d5c43; font-weight:700; } .section-heading { display:flex; justify-content:space-between; align-items:center; }
    .section-heading button { background:transparent; color:#596451; padding:4px; } article { border-top:1px solid #e4e9df; padding-top:12px; } article.unread { border-left:3px solid #d7fb64; padding-left:10px; } article p { color:#65705f; margin:5px 0 10px; }
  `,
})
export class PushNotificationsDemoComponent {
  readonly push = inject(BrowserPushService);
  message = '';

  constructor() { void this.push.refreshNotifications(); }

  async enable(): Promise<void> {
    const result = await this.push.enable([this.demoPayment()]);
    this.message = result === 'enabled' ? 'Web Push activado y suscripción registrada.' : `Resultado: ${result}`;
  }

  async sendTest(): Promise<void> {
    try { await this.push.sendTest(); this.message = 'Notificación de prueba enviada.'; }
    catch { this.message = 'No se pudo enviar. Inicia sesión o revisa la configuración VAPID.'; }
  }

  async syncReminder(): Promise<void> {
    try { await this.push.syncReminders([this.demoPayment()]); this.message = 'Recordatorio de prueba sincronizado.'; }
    catch { this.message = 'No se pudo sincronizar el recordatorio.'; }
  }

  async disable(): Promise<void> { await this.push.disable(); this.message = 'Web Push desactivado.'; }
  async refresh(): Promise<void> { await this.push.refreshNotifications(); this.message = 'Centro actualizado.'; }
  async read(id: string): Promise<void> { await this.push.markNotificationRead(id); }

  private demoPayment(): Payment {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return { id: 999999, name: 'Recordatorio de prueba', amount: 1, date: date.toISOString().slice(0, 10), accountId: 1 };
  }
}
